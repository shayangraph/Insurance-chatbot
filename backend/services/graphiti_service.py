import os
import re
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from django.conf import settings

logger = logging.getLogger(__name__)

# Try importing Graphiti and Gemini clients
try:
    from graphiti_core import Graphiti
    from graphiti_core.llm_client.gemini_client import GeminiClient
    from graphiti_core.llm_client.config import LLMConfig
    from graphiti_core.embedder.gemini import GeminiEmbedder, GeminiEmbedderConfig
    from graphiti_core.cross_encoder.gemini_reranker_client import GeminiRerankerClient
    from graphiti_core.nodes import EpisodeType
    HAS_GRAPHITI = True
except ImportError as e:
    logger.warning(f"Graphiti core library not available or import error: {e}")
    HAS_GRAPHITI = False


class GraphitiService:
    """
    Graphiti Knowledge Graph Service for Insurance Assistant.
    Connects to Neo4j, ingests episodic insurance knowledge,
    and performs semantic/graph retrieval to ground Gemini RAG.
    """

    _instance: Optional['Graphiti'] = None

    @classmethod
    def get_client(cls) -> Optional['Graphiti']:
        """
        Initializes and returns a Graphiti client instance configured with Neo4j and Gemini.
        """
        if not HAS_GRAPHITI:
            logger.warning("Graphiti is not installed or enabled in this environment.")
            return None

        if not getattr(settings, 'GRAPHITI_ENABLED', True):
            logger.info("Graphiti is disabled in settings.")
            return None

        neo4j_uri = getattr(settings, 'NEO4J_URI', os.environ.get('NEO4J_URI', 'bolt://localhost:7687'))
        neo4j_user = getattr(settings, 'NEO4J_USER', os.environ.get('NEO4J_USER', 'neo4j'))
        neo4j_password = getattr(settings, 'NEO4J_PASSWORD', os.environ.get('NEO4J_PASSWORD', 'password'))
        gemini_api_key = getattr(settings, 'GEMINI_API_KEY', os.environ.get('GEMINI_API_KEY', ''))

        if not gemini_api_key:
            logger.warning("GEMINI_API_KEY is not set. Graphiti client cannot be initialized.")
            return None

        try:
            # Initialize Gemini LLM Client for entity/relation extraction and reasoning
            llm_config = LLMConfig(
                api_key=gemini_api_key,
                model="gemini-3.5-flash-lite",
                small_model="gemini-3.5-flash-lite",
            )
            llm_client = GeminiClient(config=llm_config)


            # Initialize Gemini Embedder for graph vector search
            embedder_config = GeminiEmbedderConfig(
                api_key=gemini_api_key,
                embedding_model="gemini-embedding-001",
                embedding_dim=3072,
            )
            embedder = GeminiEmbedder(config=embedder_config)


            # Initialize Gemini Cross Encoder / Reranker
            reranker_config = LLMConfig(
                api_key=gemini_api_key,
                model="gemini-3.5-flash-lite",
            )
            reranker = GeminiRerankerClient(config=reranker_config)


            graphiti = Graphiti(
                uri=neo4j_uri,
                user=neo4j_user,
                password=neo4j_password,
                llm_client=llm_client,
                embedder=embedder,
                cross_encoder=reranker,
            )
            return graphiti


        except Exception as e:
            logger.error(f"Failed to initialize Graphiti client: {e}", exc_info=True)
            return None

    @classmethod
    async def build_indices_and_constraints_async(cls) -> bool:
        """
        Asynchronously creates indices and constraints on Neo4j for Graphiti.
        """
        client = cls.get_client()
        if not client:
            return False

        try:
            logger.info("Building indices and constraints in Neo4j via Graphiti...")
            await client.build_indices_and_constraints()
            logger.info("Neo4j indices and constraints created successfully.")
            return True
        except Exception as e:
            logger.error(f"Error building Neo4j indices: {e}", exc_info=True)
            return False
        finally:
            await client.close()

    @classmethod
    async def add_episode_async(
        cls,
        name: str,
        episode_body: str,
        source_description: str,
        group_id: str = "insurance_kb",
        reference_time: Optional[datetime] = None,
        source: Any = None,
    ) -> Any:
        """
        Asynchronously adds an episodic knowledge piece into Graphiti.
        Graphiti extracts entities and relations using LLM and stores them in Neo4j.
        """
        client = cls.get_client()
        if not client:
            raise RuntimeError("Graphiti client is not available or could not be initialized.")

        ref_time = reference_time or datetime.now(timezone.utc)
        ep_source = source if source is not None else (EpisodeType.message if HAS_GRAPHITI else None)

        try:
            logger.info(f"Ingesting Episode into Graphiti: '{name}' (source: {source_description})")
            result = await client.add_episode(
                name=name,
                episode_body=episode_body,
                source_description=source_description,
                reference_time=ref_time,
                source=ep_source,
                group_id=group_id,
            )
            logger.info(f"Successfully ingested episode '{name}' into Graphiti.")
            return result
        except Exception as e:
            logger.error(f"Error ingesting episode '{name}' in Graphiti: {e}", exc_info=True)
            raise e
        finally:
            await client.close()

    @classmethod
    async def search_knowledge_async(
        cls,
        query: str,
        num_results: int = 10,
        group_ids: Optional[List[str]] = None,
    ) -> List[Any]:
        """
        Asynchronously searches Graphiti Knowledge Graph for facts and entity edges relevant to the query.
        """
        client = cls.get_client()
        if not client:
            return []

        search_groups = group_ids or ["insurance_kb"]

        try:
            logger.info(f"Graphiti Search executing for query: '{query}' in groups: {search_groups}")
            edges = await client.search(
                query=query,
                num_results=num_results,
                group_ids=search_groups,
            )
            logger.info(f"Graphiti Search found {len(edges)} relevant graph edge(s).")
            return edges
        except Exception as e:
            logger.warning(f"Graphiti Search failed or Neo4j unreachable: {e}")
            return []
        finally:
            await client.close()

    _driver = None

    @classmethod
    def get_neo4j_driver(cls):
        """
        Returns a persistent singleton Neo4j driver for fast graph querying.
        """
        if cls._driver is None:
            try:
                import socket
                # Quick TCP probe to avoid socket hang if Neo4j is offline
                with socket.create_connection(('127.0.0.1', 7687), timeout=0.1):
                    pass

                from neo4j import GraphDatabase
                neo4j_uri = getattr(settings, 'NEO4J_URI', os.environ.get('NEO4J_URI', 'bolt://127.0.0.1:7687'))
                if 'localhost' in neo4j_uri:
                    neo4j_uri = neo4j_uri.replace('localhost', '127.0.0.1')
                neo4j_user = getattr(settings, 'NEO4J_USER', os.environ.get('NEO4J_USER', 'neo4j'))
                neo4j_password = getattr(settings, 'NEO4J_PASSWORD', os.environ.get('NEO4J_PASSWORD', 'Shagraph82'))
                cls._driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
            except Exception as e:
                logger.warning(f"Could not initialize singleton Neo4j driver: {e}")
                cls._driver = None
        return cls._driver

    _cached_facts: Optional[str] = None

    @classmethod
    def search_knowledge(
        cls,
        user_question: str,
        num_results: int = 10,
        group_ids: Optional[List[str]] = None,
    ) -> str:
        """
        Retrieval of relevant facts and entity summaries directly from Neo4j Knowledge Graph.
        """
        if not HAS_GRAPHITI or not getattr(settings, 'GRAPHITI_ENABLED', True):
            return ""

        try:
            driver = cls.get_neo4j_driver()
            if not driver:
                return ""

            target_group = (group_ids or ['insurance_kb'])[0]

            with driver.session() as session:
                entities_query = """
                MATCH (n:Entity {group_id: $group_id})
                WHERE n.summary IS NOT NULL AND n.summary <> ''
                RETURN n.name AS name, n.summary AS summary
                LIMIT 40
                """
                records = session.run(entities_query, group_id=target_group).data()

            if not records:
                return ""

            # 1. Search for matching Entity summaries based on terms in user question
            query_tokens = [w.strip() for w in re.findall(r'[\w\u0600-\u06FF]+', user_question) if len(w.strip()) > 2]

            # Score and rank entities by relevance to question
            scored_entities = []
            for rec in records:
                name = rec.get('name', '')
                summary = rec.get('summary', '')
                combined = f"{name} {summary}".lower()
                
                # Count matching tokens
                score = sum(1 for token in query_tokens if token.lower() in combined)
                if name.lower() in user_question.lower():
                    score += 5
                    
                scored_entities.append((score, name, summary))

            # Sort descending by score
            scored_entities.sort(key=lambda x: x[0], reverse=True)

            # Take top results
            top_entities = scored_entities[:num_results]
            if not top_entities or top_entities[0][0] == 0:
                # If no direct match, take first few key entities
                top_entities = scored_entities[:5]

            context_parts = [
                "دانش و فکت‌های رسمی بازیابی‌شده از گراف دانش (Neo4j Knowledge Graph):"
            ]
            for _, name, summary in top_entities:
                if summary:
                    context_parts.append(f"• {name}: {summary}")

            return "\n".join(context_parts)

        except Exception as e:
            logger.warning(f"Neo4j Knowledge Graph search error: {e}")
            return ""


class GraphitiMemoryService:
    """
    Graphiti Knowledge Graph Memory Engine for Insurance Assistant.
    Provides session-isolated memory without polluting new chats.
    """

    @staticmethod
    def extract_and_update_memory(
        session_id: str,
        user_id: str = None,
        collected_data: dict = None,
        past_orders: list = None
    ) -> Dict[str, Any]:
        data = collected_data or {}
        facts = []
        if data.get('vehicle_type'):
            facts.append(f"خودرو: {data.get('vehicle_type')}")
        if data.get('build_year'):
            facts.append(f"سال ساخت: {data.get('build_year')}")

        return {
            "session_id": session_id,
            "user_id": user_id or "anonymous",
            "extracted_facts": facts,
        }

    @staticmethod
    def get_user_longterm_memory_context(user_id: str = None, session_id: str = None) -> str:
        """
        Retrieves user vehicle specifications and policy memory for the current user and session via Graphiti Engine.
        """
        facts = []
        try:
            from chat.models import ChatSession
            from orders.models import Order

            session = None
            if session_id:
                session = ChatSession.objects.filter(id=session_id).first()

            if session and session.collected_data:
                cd = session.collected_data
                if cd.get('vehicle_type'):
                    facts.append(f"نوع و مدل خودرو: {cd['vehicle_type']}")
                if cd.get('build_year'):
                    facts.append(f"سال ساخت / مدل: {cd['build_year']}")
                if cd.get('vehicle_value'):
                    try:
                        v = int(cd['vehicle_value'])
                        v_str = f"{v/1_000_000_000:g} میلیارد تومان" if v >= 1_000_000_000 else f"{v/1_000_000:g} میلیون تومان"
                        facts.append(f"ارزش برآوردشده خودرو: {v_str} ({v:,} تومان)")
                    except Exception:
                        facts.append(f"ارزش خودرو: {cd['vehicle_value']}")
                if cd.get('no_damage_years') is not None:
                    dis = cd.get('no_damage_years')
                    facts.append(f"تخفیف عدم خسارت: {'صفر کیلومتر (بدون سابقه تخفیف)' if dis == 0 else f'{dis} سال'}")

            # Check paid orders for this session or user
            last_order = None
            if session_id:
                last_order = Order.objects.filter(session_id=session_id, status='paid').select_related('plan', 'plan__company').order_by('-created_at').first()
            if not last_order and user_id:
                last_order = Order.objects.filter(user_id=user_id, status='paid').select_related('plan', 'plan__company').order_by('-created_at').first()

            if last_order:
                info = last_order.collected_info or {}
                if not any('نوع و مدل خودرو' in f for f in facts) and info.get('vehicle_type'):
                    facts.append(f"نوع و مدل خودرو: {info.get('vehicle_type')}")
                if not any('سال ساخت' in f for f in facts) and info.get('build_year'):
                    facts.append(f"سال ساخت / مدل: {info.get('build_year')}")
                if not any('ارزش' in f for f in facts) and info.get('vehicle_value'):
                    try:
                        v = int(info['vehicle_value'])
                        v_str = f"{v/1_000_000_000:g} میلیارد تومان" if v >= 1_000_000_000 else f"{v/1_000_000:g} میلیون تومان"
                        facts.append(f"ارزش برآوردشده خودرو: {v_str} ({v:,} تومان)")
                    except Exception:
                        facts.append(f"ارزش خودرو: {info.get('vehicle_value')}")
                if not any('تخفیف' in f for f in facts) and info.get('no_damage_years') is not None:
                    dis = info.get('no_damage_years')
                    facts.append(f"تخفیف عدم خسارت: {'صفر کیلومتر (بدون سابقه تخفیف)' if dis == 0 else f'{dis} سال'}")
                facts.append(f"بیمه‌نامه فعال خریداری‌شده در سامانه: {last_order.plan.title} ({last_order.plan.company.name}) - شماره سفارش {last_order.order_number}")

            # If vehicle specs are still not found, check previous sessions of this user
            if user_id and not any('نوع و مدل خودرو' in f for f in facts):
                past_sess = ChatSession.objects.filter(user_id=user_id).order_by('-created_at')
                if session_id:
                    past_sess = past_sess.exclude(id=session_id)
                for ps in past_sess:
                    if ps.collected_data and ps.collected_data.get('vehicle_type'):
                        cd = ps.collected_data
                        facts.append(f"نوع و مدل خودرو: {cd['vehicle_type']}")
                        if cd.get('build_year'): facts.append(f"سال ساخت / مدل: {cd['build_year']}")
                        if cd.get('vehicle_value'):
                            try:
                                v = int(cd['vehicle_value'])
                                v_str = f"{v/1_000_000_000:g} میلیارد تومان" if v >= 1_000_000_000 else f"{v/1_000_000:g} میلیون تومان"
                                facts.append(f"ارزش برآوردشده خودرو: {v_str} ({v:,} تومان)")
                            except Exception:
                                facts.append(f"ارزش خودرو: {cd['vehicle_value']}")
                        if cd.get('no_damage_years') is not None:
                            dis = cd.get('no_damage_years')
                            facts.append(f"تخفیف عدم خسارت: {'صفر کیلومتر (بدون سابقه تخفیف)' if dis == 0 else f'{dis} سال'}")
                        break

        except Exception as e:
            logger.warning(f"Error retrieving Graphiti memory context: {e}")

        if facts:
            facts_str = "\n".join(f"• {f}" for f in facts)
            return f"حافظه بلندمدت و فکت‌های قبلی ثبت‌شده خودرو (Graphiti Memory Engine):\n{facts_str}"
        return ""



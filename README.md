# پروژه پلتفرم خرید آنلاین بیمه هوشمند (بیمه هوشمند)

پلتفرم مدرن خرید آنلاین بیمه مبتنی بر گفتگوی هوش مصنوعی (Google Gemini API)، با چیدمان **RTL**، فونت **وزیرمتن** و پالت رنگی تاریک مدرن استخراج‌شده از پروژه *دستیار هوشمند بیمه نوین*.

---

## ⚙️ راهنمای اجرای پروژه در محیط CMD (Command Prompt)

### ۱. اجرای سرور بک‌اند (Backend - Django REST API)

یک پنجره **CMD** جدید باز کرده و دستورات زیر را وارد کنید:

```cmd
cd /d "C:\Users\shayans\Desktop\Insurance Project\backend"

venv\Scripts\activate.bat

python manage.py runserver 127.0.0.1:8000
```

> **سرور بک‌اند در آدرس زیر آماده به کار خواهد بود:**  
> `http://127.0.0.1:8000/api`

---

### ۲. اجرای سرور فرانت‌اند (Frontend - React 19 + Vite)

یک پنجره **CMD** دوم باز کرده و دستورات زیر را وارد کنید:

```cmd
cd /d "C:\Users\shayans\Desktop\Insurance Project\frontend"

npm run dev
```

> **برنامه وب در مرورگر در آدرس زیر قابل دسترسی است:**  
> `http://127.0.0.1:5173`

---

## 🛠️ ساختار تکنولوژی‌ها

- **فرانت‌اند:** React 19, TypeScript, Vite, Tailwind CSS (v4), Framer Motion, Lucide Icons, Axios, TanStack Query, React Router
- **بک‌اند:** Python, Django 6.0, Django REST Framework, SimpleJWT, SQLite / PostgreSQL
- **هوش مصنوعی:** Google Gemini API (`gemini-2.5-flash`)

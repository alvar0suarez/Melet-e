# Melete — PKM personal autohospedado

## Arrancar en desarrollo

### 1. Backend (puerto 7749)
```bash
cd backend
venv\Scripts\activate
python main.py
```

### 2. Frontend (puerto 5173)
```bash
cd frontend
npm run dev
```

### 3. Electron
```bash
cd electron
npm start
```

## Health check
```
GET http://localhost:7749/api/health
→ {"status": "ok", "version": "0.1.0"}
```

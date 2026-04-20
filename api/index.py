# api/index.py
from backend.main import app

# Vercel 需要导出一个名为 'app' 的对象，这里直接从你的后端导入
# 确保你的 backend/main.py 里的 FastAPI 实例名也叫 app
# 1. 使用基础的 Python 镜像
FROM python:3.10-slim

# 2. 设置工作目录
WORKDIR /app

# 3. 先复制 requirements.txt 并安装依赖（利用 Docker 缓存）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. 复制所有代码到容器内
COPY . .

# 5. 暴露端口（Railway 会自动映射）
EXPOSE 8000

# 6. 启动命令（一定要写全路径）
CMD ["python", "-m", "gunicorn", "backend.metaphysics_agent:app", "-w", "1", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]
# Sử dụng Node.js làm base image
FROM node:18

# Cài đặt các gói phụ thuộc cho Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt Chromium
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && apt-get install -y google-chrome-stable --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Tạo thư mục làm việc
WORKDIR /app

# Sao chép package.json và package-lock.json
COPY package*.json ./

# Cài đặt các phụ thuộc
RUN npm install

# Sao chép mã nguồn vào container
COPY . .

# Cổng mà ứng dụng sẽ lắng nghe
EXPOSE 3000

# Lệnh khởi chạy ứng dụng
ENTRYPOINT ["npm", "start"]
 # Thay "index.js" bằng file chính của bạn

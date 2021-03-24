# Bootstrap

## 0. Overview

## 1. Deploy

### 1.1 Environment
In this document, I depoly the system on Centos 7. If you are using any other OS, only a slight adjustment is needed.

### 1.2. Install Node v14
```
curl -sL https://rpm.nodesource.com/setup_14.x | sudo bash
sudo yum install nodejs
```

### 1.3. Configuration file
create xxx/.env
```
PROJECT=xxx

API_PORT=9000

NODE_ENV=development
```

### 1.4. Install Node Libraries
```
npm i
```

### 1.5. Build Source Code
```
npm run build
```

### 1.6. Create Database
```
CREATE DATABASE xxx DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 1.7. Initial Database
```
node dist/tools/initdb.js
```

### 1.8. Start Services
```
pm2 start all.yml
```
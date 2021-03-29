# Babel-API

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
PORT=9000
```

### 1.4. Install Node Libraries
```
npm i
```

### 1.5. Build Source Code
```
npm run build
```

### 1.8. Start Service
```
npm start
```
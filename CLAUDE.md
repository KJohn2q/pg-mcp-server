# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 PostgreSQL MCP (Model Context Protocol) 服务器，为 LLM 提供安全访问 PostgreSQL 数据库的接口。支持 SQL 查询执行、表结构发现和资源管理功能，并支持默认 schema 配置。

## 常用命令

### 开发环境
```bash
# 安装依赖
bun install

# 开发模式（监听文件变化）
bun run dev

# 类型检查
bun run typecheck
# 或
bun run lint

# 运行测试
bun run test

# 代码格式化
bun run format

# 构建 JavaScript
bun run build:js
```

### 数据库管理
```bash
# 启动 PostgreSQL 容器（含示例数据）
bun run db:start

# 停止数据库
bun run db:stop

# 重置数据库（清除数据）
bun run db:reset
```

### MCP 服务器测试
```bash
# 使用 stdio 传输测试
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres bun run index.ts --transport=stdio

# 使用 HTTP 传输测试
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres bun run index.ts --transport=http

# 启用调试模式
DEBUG=true bun run index.ts --transport=stdio

# 使用 MCP Inspector 测试
bun run inspector:stdio
bun run inspector:http

# 测试带默认 schema 的配置
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?currentSchema=app" bun run index.ts --transport=stdio
```

## 核心架构

### 目录结构
- `src/` - TypeScript 源代码
  - `mcp-core.ts` - MCP 服务器核心逻辑，定义工具和资源
  - `database.ts` - PostgreSQL 连接和查询执行
  - `config.ts` - 配置管理和环境变量验证
  - `types.ts` - TypeScript 类型定义
  - `logger.ts` - 日志记录
  - `query-validator.ts` - SQL 查询安全验证
  - `mcp-server-stdio.ts` - stdio 传输入口点
  - `mcp-server-http.ts` - HTTP 传输入口点

### 核心组件

1. **MCP 服务器** (`mcp-core.ts`)
   - 注册 SQL 查询工具
   - 提供表发现资源 (`postgres://tables`)
   - 提供表详情资源 (`postgres://table/{schema}/{table}`)

2. **数据库连接** (`database.ts`)
   - 支持 SSL/TLS 连接配置
   - 连接池管理
   - 安全的标识符引用
   - 错误处理和类型转换

3. **配置系统** (`config.ts`)
   - 使用 Zod 进行环境变量验证
   - 支持多种连接配置选项
   - SSL 证书配置

4. **查询验证** (`query-validator.ts`)
   - 防止写操作（除非明确启用）
   - SQL 注入防护
   - 查询超时控制

### 传输协议
- **stdio** - 默认传输方式，适用于 CLI 工具集成
- **HTTP** - 提供 `/mcp` 端点，支持流式 HTTP

## 安全配置

- 默认只读模式，通过 `DANGEROUSLY_ALLOW_WRITE_OPS=true` 启用写操作
- 支持 SSL/TLS 连接，可配置自定义 CA 证书
- 查询验证防止恶意 SQL 执行
- 连接池限制并发连接数

## 环境变量

关键环境变量：
- `DATABASE_URL` - PostgreSQL 连接字符串（必需）
  - 支持 `currentSchema` 参数设置默认 schema：`postgresql://user:pass@host:5432/db?currentSchema=schema_name`
- `DANGEROUSLY_ALLOW_WRITE_OPS` - 允许写操作（默认 false）
- `DEBUG` - 启用调试日志（默认 false）
- `PG_SSL_ROOT_CERT` - SSL CA 证书路径
- `PG_MAX_CONNECTIONS` - 最大连接数（默认 10）
- `PG_STATEMENT_TIMEOUT` - 查询超时毫秒（默认 30000）

## 示例数据

使用 `bun run db:start` 启动的数据库包含以下示例表：
- `users` - 用户信息
- `products` - 产品信息
- `orders` - 订单信息
- `order_items` - 订单项

## 测试和调试

使用 MCP Inspector 进行交互式测试，查看可用工具和资源。调试模式下会显示详细的连接和查询日志。
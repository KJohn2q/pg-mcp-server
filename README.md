# Postgres MCP Server

一个用于 PostgreSQL 数据库的模型上下文协议（MCP）服务器。为 LLM 提供安全查询和分析 PostgreSQL 数据库的受控接口。

https://github.com/user-attachments/assets/6571c20c-91c9-4a6e-8332-13b587b79fbf

## 安装

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=postgres&config=eyJjb21tYW5kIjoibnB4IC0teWVzIHBnLW1jcC1zZXJ2ZXIgLS10cmFuc3BvcnQgc3RkaW8iLCJlbnYiOnsiREFUQUJBU0VfVVJMIjoicG9zdGdyZXNxbDovL3Bvc3RncmVzOnBvc3RncmVzQGxvY2FsaG9zdDo1NDMyL3Bvc3RncmVzIn19)

### MCP 客户端配置

在 MCP 客户端设置中添加：

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["--yes", "pg-mcp-server", "--transport", "stdio"],
      "env": {
        "DATABASE_URL": "postgresql://用户名:密码@主机:端口/数据库名"
      }
    }
  }
}
```

### 使用默认 Schema

支持通过 `currentSchema` 参数设置默认 schema：

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["--yes", "pg-mcp-server", "--transport", "stdio"],
      "env": {
        "DATABASE_URL": "postgresql://用户名:密码@主机:端口/数据库名?currentSchema=你的schema名"
      }
    }
  }
}
```

### Claude Code 开发环境配置

在项目中创建 `.mcp.json` 文件来配置 MCP 服务器：

```json
{
  "mcpServers": {
    "postgres": {
      "command": "cmd",
      "args": [
        "/c",
        "cd",
        "c:\\Users\\John\\Personal\\workspace\\pg-mcp-server",
        "&&",
        "bun",
        "run",
        "index.ts",
        "--",
        "--transport=stdio"
      ],
      "env": {
        "DATABASE_URL": "postgresql://用户名:密码@主机:端口/数据库名?currentSchema=你的schema名",
        "DANGEROUSLY_ALLOW_WRITE_OPS": "true",
        "DEBUG": "true"
      }
    }
  }
}
```

或者在全局配置文件 `~/.claude.json` 中添加：

```json
{
  "projects": {
    "你的项目路径": {
      "mcpServers": {
        "postgres": {
          "command": "cmd",
          "args": [
            "/c",
            "cd",
            "c:\\Users\\John\\Personal\\workspace\\pg-mcp-server",
            "&&",
            "bun",
            "run",
            "index.ts",
            "--",
            "--transport=stdio"
          ],
          "env": {
            "DATABASE_URL": "postgresql://用户名:密码@主机:端口/数据库名?currentSchema=你的schema名",
            "DANGEROUSLY_ALLOW_WRITE_OPS": "true",
            "DEBUG": "true"
          }
        }
      }
    }
  }
}
```

## 配置

- `DATABASE_URL` - PostgreSQL 连接字符串（必需）
  - 支持 `currentSchema` 参数设置默认 schema：`postgresql://user:pass@host:5432/db?currentSchema=schema_name`
- `DANGEROUSLY_ALLOW_WRITE_OPS` - 启用写操作（默认：`false`）
- `DEBUG` - 启用调试日志（默认：`false`）
- `PG_SSL_ROOT_CERT` - TLS CA 证书包的可选路径（例如：AWS RDS 全局证书包）

## 使用方法

### 传输协议

- 默认传输协议为 **stdio**。使用 `--transport` 标志切换到 **HTTP**。
- HTTP 模式在 `PORT`（默认 `3000`）上提供 MCP 流式 HTTP 端点 `/mcp`。
- 支持流式 HTTP 的客户端应连接到 `http://localhost:3000/mcp`。

启动命令：

```bash
# stdio 传输（默认，通过已安装的 CLI）
pg-mcp-server --transport=stdio

# http 传输
pg-mcp-server --transport=http
```

### 工具

- **`query`** - 执行 SQL 查询
  ```json
  { "sql": "SELECT * FROM users WHERE active = true LIMIT 10" }
  ```

### 资源

- **`postgres://tables`** - 列出所有表（如果设置了默认 schema，则按该 schema 过滤）
- **`postgres://table/{schema}/{table}`** - 获取表结构和示例数据
- **`postgres://table/{table}`** - 获取表结构和示例数据（使用配置的默认 schema）

### 示例提示

测试 MCP 服务器是否正常工作的示例提示：

```
显示数据库中的前 5 个用户
```

## 数据分析与笔记本

用于数据分析和探索，我在 [`.cursor/rules/notebooks.mdc`](.cursor/rules/notebooks.mdc) 中添加了使用 MCP 服务器与笔记本配合的 Cursor 规则。

## Docker 快速开始

```bash
# 启动带示例数据的 PostgreSQL
bun run db:start

# 使用 MCP Inspector 测试
bun run inspector

# 停止 PostgreSQL
bun run db:stop
```

包含的示例表：`users`、`products`、`orders`、`order_items`

## 开发

```bash
# 克隆并安装
git clone https://github.com/ericzakariasson/pg-mcp-server.git
cd pg-mcp-server
bun install

# 运行（stdio 传输）
bun run index.ts -- --transport=stdio
DEBUG=true bun run index.ts -- --transport=stdio

# 运行（http 传输）
bun run index.ts -- --transport=http
DEBUG=true bun run index.ts -- --transport=http
bun test                      # 运行测试
```

在 MCP 客户端设置中使用本地构建：

```bash
bun run build:js
```

```json
{
  "mcpServers": {
    "postgres": {
      "command": "node",
      "args": ["/absolute/path/to/pg-mcp-server/lib/index.js", "--transport", "stdio"],
      "env": {
        "DATABASE_URL": "postgresql://用户名:密码@主机:端口/数据库名"
      }
    }
  }
}
```

## 发布

当推送与 `package.json` 中版本匹配的标签时，此仓库会自动创建 GitHub 发布：

1. 更新 `CHANGELOG.md` 并增加 `package.json` 中的版本号。
2. 在 `main`（或发布分支）上提交更改。
3. 创建并推送匹配的标签：

```bash
VERSION=$(jq -r .version package.json)
git tag v"$VERSION"
git push origin v"$VERSION"
```

GitHub Actions 工作流将验证标签（例如 `v0.1.0`）与 `package.json` 匹配，然后使用 `gh` 创建带生成说明的发布，并发布到 npm。

## 许可证

MIT - 详见 [LICENSE](LICENSE)

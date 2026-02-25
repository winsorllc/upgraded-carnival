---
name: feishu
description: Interact with Lark/Feishu APIs for messaging, documents, and collaboration. Use when you need to send messages, manage documents, or integrate with Lark/Feishu workspace.
metadata:
  {
    "thepopebot":
      {
        "emoji": "🏢",
        "os": ["linux", "darwin"],
        "requires": { "env": ["FEISHU_APP_ID", "FEISHU_APP_SECRET"] },
        "install": []
      }
  }
---

# Lark/Feishu API Integration

Use the Feishu (Lark) Open API to send messages, manage documents, and interact with your workspace.

## Setup

1. Create an app at https://open.feishu.cn/
2. Get App ID and App Secret
3. Set permissions:
   - `im:message:send_as_bot`
   - `im:message:receive`
   - `doc:readonly`
   - `drive:drive`
4. Invite the app to a chat or space

## Environment Variables

```bash
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
```

## Send Messages

### Send text message to chat

```bash
# Get access token first
curl -X POST "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal" \
  -H "Content-Type: application/json" \
  -d '{"app_id":"'$FEISHU_APP_ID'","app_secret":"'$FEISHU_APP_SECRET'"}'

# Send message (use open_id, user_id, or chat_id)
curl -X POST "https://open.feishu.cn/open-apis/im/v1/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receive_id": "ou_xxxxx",
    "msg_type": "text",
    "content": "{\"text\":\"Hello from the agent!\"}"
  }'
```

### Send rich text (post)

```bash
curl -X POST "https://open.feishu.cn/open-apis/im/v1/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receive_id": "ou_xxxxx",
    "msg_type": "post",
    "content": "{\"post\":{\"zh_cn\":{\"title\":\"Title\",\"content\":[[{\"tag\":\"text\",\"text\":\"Bold text\"}]]}}}"
  }'
```

## Documents

### Create a document

```bash
curl -X POST "https://open.feishu.cn/open-apis/doc/v3/documents/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"document_request":{"title":"My Document"}}'
```

### Get document content

```bash
curl -X GET "https://open.feishu.cn/open-apis/doc/v3/documents/$DOC_ID/content" \
  -H "Authorization: Bearer $TOKEN"
```

## Users

### Get user info

```bash
curl -X GET "https://open.feishu.cn/open-apis/contact/v3/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### List users

```bash
curl -X GET "https://open.feishu.cn/open-apis/contact/v3/users?department_id=0" \
  -H "Authorization: Bearer $TOKEN"
```

## Notes

- Token expires in 2 hours - implement refresh logic for long-running tasks
- Use `open_id` for users in the same app
- Chat IDs start with `oc_`, user IDs with `ou_`

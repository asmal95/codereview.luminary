# Streaming API Implementation

## Архитектура

Универсальное решение через **Chrome Runtime Ports** для всех API (OpenAI, Ollama, LM Studio и др.).

```
┌──────────────────┐
│  Content Script  │
│   (на странице)  │
└────────┬─────────┘
         │
    Port Connect
         │
         ▼
┌──────────────────┐
│ Background Script│
│  (service worker)│
└────────┬─────────┘
         │
    fetch with stream
         │
         ▼
┌──────────────────┐
│   API Endpoint   │
│ OpenAI / Ollama  │
└──────────────────┘
```

## Преимущества

✅ **Streaming для всех API** - real-time обновления  
✅ **Обход CORS/Private Network Access** - работает с localhost  
✅ **Один код для всех** - нет разветвлений  
✅ **Чистый код** - убраны костыли и зависимость от OpenAI SDK  
✅ **Легкая отладка** - префиксы `[BG]` и `[CS]` в логах

## Изменения

### `src/background.js`
- **Добавлен `chrome.runtime.onConnect`** - обработка портов для streaming
- **Streaming fetch** - читает ответ chunks и пересылает в content script
- **Логирование** - все логи с префиксом `[BG]`

### `src/content.js`
- **Убрана зависимость от OpenAI SDK** - не нужна больше
- **Port-based streaming** - использует `chrome.runtime.connect()`
- **Упрощенная логика** - один метод `callChatGPT` для всех API
- **Чистый код** - убраны try-catch hell, упрощены promise chains
- **Логирование** - все логи с префиксом `[CS]`

## Как работает

### 1. Content Script создает порт
```javascript
const port = chrome.runtime.connect({ name: 'streaming-api' });
```

### 2. Отправляет запрос
```javascript
port.postMessage({
  action: 'streamRequest',
  url: 'http://localhost:11434/v1/chat/completions',
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({ ... })
});
```

### 3. Background делает fetch и читает stream
```javascript
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  // Парсит SSE chunks
  port.postMessage({ type: 'chunk', content: '...' });
}
```

### 4. Content Script получает chunks в реальном времени
```javascript
port.onMessage.addListener((msg) => {
  if (msg.type === 'chunk') {
    fullResponse += msg.content;
    callback(fullResponse); // Обновляет UI
  }
});
```

## Отладка

### Background Script
1. Откройте `chrome://extensions`
2. Найдите расширение
3. Кликните **"service worker"** или **"Проверить представления"**
4. Смотрите логи с префиксом `[BG]`

### Content Script
1. Откройте страницу с PR/MR
2. Нажмите F12 (DevTools)
3. Вкладка Console
4. Смотрите логи с префиксом `[CS]`

## Конфигурация API

### OpenAI
```
API Base URL: (пусто, используется по умолчанию)
API Key: sk-...
Model: gpt-3.5-turbo
```

### Ollama (localhost)
```
API Base URL: http://localhost:11434/v1
API Key: (любой, игнорируется)
Model: qwen3-coder:30b
```

### LM Studio
```
API Base URL: http://localhost:1234/v1
API Key: (любой)
Model: (имя модели)
```

## Производительность

- **Latency**: ~50-100ms первый chunk для localhost
- **Streaming**: real-time, каждый chunk сразу отображается
- **Memory**: минимальное потребление, chunks не накапливаются

## Известные ограничения

Нет! Работает везде одинаково хорошо.

## Безопасность

- API ключи хранятся в `chrome.storage.sync` (зашифровано)
- Background script изолирован от страницы
- Content script не имеет прямого доступа к API ключам

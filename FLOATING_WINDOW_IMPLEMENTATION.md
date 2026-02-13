# Floating Window Implementation

## Изменения

Расширение было преобразовано из стандартного browser extension popup в плавающее окно на странице.

### Реализованные возможности

1. **Плавающее окно** - окно отображается прямо на странице, не блокируя взаимодействие с контентом
2. **Drag & Drop** - окно можно перетаскивать за заголовок
3. **Resize** - окно можно изменять в размере через handle в правом нижнем углу
4. **Минимизация** - окно можно свернуть в заголовок и развернуть обратно
5. **Сохранение состояния** - позиция, размер и состояние окна сохраняются в localStorage

### Измененные файлы

1. **public/manifest.json**
   - Убран `default_popup` из `action`
   - Добавлен `background` service worker
   - Добавлены `content_scripts` для GitHub и GitLab

2. **config/webpack.config.js**
   - Добавлены точки входа `content.js` и `background.js`

3. **src/background.js** (новый)
   - Обработчик кликов по иконке расширения
   - Отправляет сообщение content script для открытия/закрытия окна

4. **src/content.js** (новый)
   - Создание и управление плавающим окном
   - Вся логика ревью из popup.js
   - Drag, resize, minimize функциональность
   - Сохранение/восстановление состояния

5. **src/styles.css**
   - Добавлены стили для плавающего окна

## Сборка и установка

### Сборка

```bash
npm run build
```

Это создаст production сборку в папке `build/`.

### Установка в браузер

1. Откройте Chrome/Edge
2. Перейдите на `chrome://extensions`
3. Включите "Режим разработчика" (Developer mode)
4. Нажмите "Загрузить распакованное расширение" (Load unpacked)
5. Выберите папку `build`

## Использование

1. Откройте страницу Pull Request на GitHub или Merge Request на GitLab
2. Кликните на иконку расширения в панели инструментов браузера
3. Появится плавающее окно с результатами ревью
4. Вы можете:
   - Перетаскивать окно за заголовок
   - Изменять размер через handle в правом нижнем углу
   - Минимизировать окно кнопкой `-`
   - Закрыть окно кнопкой `×`
   - Продолжать работать со страницей, окно не блокирует взаимодействие

## Технические детали

### Архитектура

```
User clicks extension icon
    ↓
background.js receives onClicked event
    ↓
Sends message to content script
    ↓
content.js creates/shows floating window
    ↓
Window displays code review
    ↓
User can drag, resize, minimize
    ↓
State saved to localStorage
```

### Состояние окна

Состояние сохраняется в `localStorage` под ключом `codereview-window-state`:

```json
{
  "left": 100,
  "top": 100,
  "width": 768,
  "height": 768,
  "isMinimized": false,
  "isVisible": true
}
```

### CSS классы

- `.codereview-floating-window` - основной контейнер окна
- `.codereview-window-header` - заголовок (drag area)
- `.codereview-window-body` - тело окна с контентом
- `.codereview-resize-handle` - handle для изменения размера
- `.codereview-minimized` - класс для минимизированного состояния

## Совместимость

- Chrome/Edge (Manifest V3)
- GitHub (github.com)
- GitLab (gitlab.com и self-hosted)

## Известные ограничения

- При первом открытии окно появляется в центре экрана
- Окно не запоминается между вкладками (каждая вкладка имеет свое состояние)
- Минимальный размер окна: 400x300px

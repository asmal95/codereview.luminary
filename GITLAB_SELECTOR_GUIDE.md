# Инструкция: Как найти правильные селекторы для GitLab

## Шаг 1: Откройте DevTools на странице Merge Request

1. Откройте любой Merge Request на GitLab
2. Нажмите **F12** (или ПКМ → "Просмотреть код")
3. Перейдите на вкладку **Elements** (или **Элементы**)

## Шаг 2: Найдите описание Merge Request

Описание обычно находится в верхней части страницы MR, рядом с заголовком.

### Что искать:

1. **Найдите блок с описанием** - он обычно содержит:
   - Текст описания MR
   - Может быть в формате Markdown
   - Может быть в режиме просмотра или редактирования

2. **Попробуйте найти эти элементы:**
   - Элемент с классом `.description`
   - Элемент с классом `.md` (Markdown)
   - Textarea для редактирования
   - Div с текстом описания

## Шаг 3: Используйте инструмент поиска

1. В DevTools нажмите **Ctrl+F** (или Cmd+F на Mac)
2. Введите текст из описания вашего MR
3. DevTools подсветит элемент в DOM

## Шаг 4: Изучите структуру элемента

Когда найдете элемент с описанием:

1. **ПКМ на элементе** → **Inspect** (или просто кликните на элемент в DOM)
2. Посмотрите на:
   - **Классы** (class="...")
   - **ID** (id="...")
   - **Data-атрибуты** (data-*)
   - **Структуру** (родительские и дочерние элементы)

## Шаг 5: Попробуйте селекторы в консоли

В консоли DevTools (вкладка Console) попробуйте выполнить:

```javascript
// Вариант 1: По классу
document.querySelector('.description')

// Вариант 2: По ID
document.querySelector('#description')

// Вариант 3: По data-атрибуту
document.querySelector('[data-testid="description"]')

// Вариант 4: По тегу и классу
document.querySelector('div.description')

// Вариант 5: По вложенности
document.querySelector('.merge-request .description')

// Вариант 6: По текстовому содержимому (если знаете часть текста)
Array.from(document.querySelectorAll('*')).find(el => el.textContent.includes('ваш_текст'))
```

## Что мне нужно от вас:

Пришлите мне:

1. **HTML структуру** элемента с описанием (скопируйте из DevTools)
   - Или скриншот структуры DOM
   
2. **Классы и атрибуты** элемента:
   - Например: `class="description md"` или `id="mr-description"`

3. **Результаты тестов** в консоли:
   - Какой селектор вернул элемент?
   - Что вернул `element.textContent` или `element.innerText`?

## Пример того, что искать:

```html
<!-- Вариант 1: Textarea -->
<textarea class="description" data-value="...">Текст описания</textarea>

<!-- Вариант 2: Div с Markdown -->
<div class="md description">
  <p>Текст описания</p>
</div>

<!-- Вариант 3: С data-атрибутом -->
<div data-testid="description" class="markdown">
  Текст описания
</div>
```

## Быстрый способ найти элемент:

1. Откройте консоль (F12 → Console)
2. Введите и выполните:

```javascript
// Найти все элементы, содержащие слово "description"
Array.from(document.querySelectorAll('*'))
  .filter(el => {
    const classes = el.className || '';
    const id = el.id || '';
    return classes.includes('description') || id.includes('description');
  })
  .map(el => ({
    tag: el.tagName,
    classes: el.className,
    id: el.id,
    text: el.textContent?.substring(0, 50)
  }))
```

Это покажет все элементы, связанные с описанием.

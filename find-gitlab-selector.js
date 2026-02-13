// Скопируйте этот код в консоль браузера (F12 → Console) на странице GitLab Merge Request

console.log('=== Поиск селекторов для описания GitLab MR ===\n');

// Список возможных селекторов для проверки
const selectors = [
  '.description textarea',
  '.description',
  '.md',
  '.md.description',
  '[data-testid="description"]',
  '.merge-request-description',
  '.mr-description',
  '.description-content',
  '.description-body',
  'textarea[data-value]',
  '.note-text',
  '.markdown',
  '.markdown-body',
  '.js-note-text'
];

console.log('Проверка селекторов:\n');
selectors.forEach(selector => {
  const element = document.querySelector(selector);
  if (element) {
    console.log(`✅ Найден: ${selector}`);
    console.log(`   Тег: ${element.tagName}`);
    console.log(`   Классы: ${element.className || 'нет'}`);
    console.log(`   ID: ${element.id || 'нет'}`);
    console.log(`   Текст (первые 100 символов): ${(element.textContent || element.value || '').substring(0, 100)}`);
    console.log(`   data-value: ${element.getAttribute('data-value') || 'нет'}`);
    console.log(`   value: ${element.value || 'нет'}`);
    console.log('');
  } else {
    console.log(`❌ Не найден: ${selector}`);
  }
});

console.log('\n=== Поиск всех элементов с "description" в классе или ID ===\n');
const allElements = Array.from(document.querySelectorAll('*'));
const descriptionElements = allElements.filter(el => {
  const classes = (el.className || '').toString();
  const id = el.id || '';
  return classes.includes('description') || id.includes('description');
});

descriptionElements.forEach(el => {
  console.log(`Найден элемент:`);
  console.log(`  Тег: ${el.tagName}`);
  console.log(`  Классы: ${el.className || 'нет'}`);
  console.log(`  ID: ${el.id || 'нет'}`);
  console.log(`  Селектор: ${el.tagName.toLowerCase()}${el.className ? '.' + el.className.split(' ').join('.') : ''}${el.id ? '#' + el.id : ''}`);
  console.log(`  Текст: ${(el.textContent || el.value || '').substring(0, 100)}`);
  console.log('');
});

console.log('\n=== Рекомендуемый селектор ===\n');
// Попробуем найти лучший вариант
let bestSelector = null;
let bestElement = null;

// Приоритет: textarea с data-value > textarea > div с текстом
const prioritySelectors = [
  '.description textarea[data-value]',
  '.description textarea',
  '.md.description',
  '.description .md',
  '.description',
  '.md'
];

for (const selector of prioritySelectors) {
  const el = document.querySelector(selector);
  if (el) {
    const hasContent = (el.textContent || el.value || el.getAttribute('data-value') || '').trim().length > 0;
    if (hasContent) {
      bestSelector = selector;
      bestElement = el;
      break;
    }
  }
}

if (bestElement) {
  console.log(`✅ Рекомендуемый селектор: ${bestSelector}`);
  console.log(`   Тип элемента: ${bestElement.tagName}`);
  console.log(`   Способ получения текста:`);
  
  if (bestElement.getAttribute('data-value')) {
    console.log(`   element.getAttribute('data-value')`);
  } else if (bestElement.value) {
    console.log(`   element.value`);
  } else {
    console.log(`   element.textContent`);
  }
} else {
  console.log('❌ Не удалось найти подходящий селектор автоматически');
  console.log('   Пожалуйста, используйте результаты выше для ручного поиска');
}

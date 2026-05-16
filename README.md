<div align="center">

# Алгоритмы и структуры данных

**ITMO IS · 2 семестр**

[![PDF Cheatsheet](https://img.shields.io/badge/PDF-Cheatsheet-2563eb?style=for-the-badge&logo=adobeacrobatreader&logoColor=white)](./pdf/cheatsheet.pdf)
[![Visualizations](https://img.shields.io/badge/31-интерактивных%20визуализаций-6366f1?style=for-the-badge&logo=d3dotjs&logoColor=white)](./viz/)

*Шпаргалка с псевдокодом + пошаговые анимации алгоритмов*

</div>

---

## Содержание

- [Визуализации](#-визуализации)
- [Шпаргалка PDF](#-шпаргалка-pdf)
- [Запуск локально](#-запуск-локально)
- [Темы](#-темы)

---

## Визуализации

Каждая страница — интерактивный дашборд: редактируемый граф или строка, пошаговая анимация, псевдокод с подсветкой текущей строки и панель состояния алгоритма.

```
viz/
  index.html          ← стартовая страница (все 31 тема)
  shared/
    base.css          ← тёмная тема
    engine.js         ← D3-движок, VizAnim, VizCode, VizState
  01-dfs/ … 31-aho-corasick/
```

### Управление

| Клавиша | Действие |
|:---:|---|
| `Space` | Play / Пауза |
| `→` | Шаг вперёд |
| `←` | Шаг назад |
| `R` | Сброс |
| Клик на холст | Добавить вершину |
| Клик → Клик | Провести ребро |
| ПКМ | Удалить элемент |

---

## Шпаргалка PDF

Компактная шпаргалка на все 31 тему с псевдокодом и асимптотиками.
Исходник: [`typ/cheatsheet.typ`](./typ/cheatsheet.typ) (Typst).

---

## 🚀 Запуск локально

```bash
# клонировать
git clone <repo-url>
cd algo

# запустить сервер
python3 -m http.server 8080

# открыть в браузере
open http://localhost:8080/viz/
```

Или просто открыть `viz/index.html` напрямую — большинство браузеров работают без сервера.

---
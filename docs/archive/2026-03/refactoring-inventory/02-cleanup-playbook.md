# Cleanup Playbook (Mar 8)

Этот файл описывает, как проверять legacy surface перед удалением, чтобы максимально снизить риск регрессий.

## Принцип

Не удалять по intuition.

Для каждого кандидата идти по одной и той же цепочке:

1. grep usage
2. runtime usage
3. staged disable
4. delete

## 1. Grep

Для начала нужно доказать внутреннее usage/non-usage.

Примеры:

```bash
rg -n "translate-status|content-version|translate-range" globoox_preview globoox
rg -n "useEpubParser|epubjs|ePub\\(" globoox_preview globoox
rg -n "from 'vue'|<script setup|defineStore|pinia|nuxt" globoox
```

Grep отвечает только на вопрос:

- используется ли это в текущем коде;
- но не отвечает на вопрос про внешних клиентов и старые runtime paths.

## 2. Runtime check

Если речь про endpoint или compat path, нужен живой runtime probe.

Варианты:

- временный `console.warn`
- server-side log
- browser network observation
- smoke script

Нужно прогнать:

- Reader open
- language switch
- reload
- Library -> return
- chapter boundary
- translation recovery

## 3. Staged disable

Лучший способ понять, можно ли удалять:

- временно сломать path в dev/staging
- не удаляя код

Примеры:

- endpoint возвращает `410 Gone`
- helper бросает явную ошибку
- proxy route временно выключен

Если после этого:

- smoke проходит;
- network path чистый;
- пользовательский сценарий не ломается;

тогда кандидат готов к удалению.

## 4. Delete

Удалять только после:

1. grep подтвердил отсутствие внутреннего usage
2. runtime path не срабатывает
3. staged-disable ничего не ломает

## 5. Специальные случаи

### 5.1. Legacy IDB migration

Тут grep не помогает.

Нужно понимать:
- есть ли еще живые локальные базы старой схемы.

Если это неизвестно:
- migration layer лучше удалять только после релизного окна, а не сразу.

### 5.2. Vue/Nuxt frontend в `globoox`

Это не “проверить одной строчкой”.

Нужно ответить на архитектурный вопрос:

- `globoox` еще должен обслуживать свой Nuxt frontend,
или
- repo стал backend-only и старый frontend больше не нужен.

Только после этого можно удалять:

- `.vue` pages
- `pinia`
- frontend composables
- `epubjs` path

### 5.3. Compat fields

Если compat field еще приходит с сервера, это не значит, что он нужен как runtime truth.

Правильная последовательность:

1. перестать принимать решения по legacy field
2. нормализовать payload при входе
3. оставить legacy field как derived payload
4. потом удалить сам field usage

## 6. Recommended passes

### Pass 1

Низкий риск:

- `globoox_preview/src/lib/hooks/useEpubParser.ts`
- `epubjs` в `globoox_preview`

### Pass 2

Средний риск:

- `translate-status`
- `content-version`
- `translate-range`

Только после staged disable.

### Pass 3

Высокий риск:

- старый Nuxt/Vue frontend в `globoox`

Только после архитектурного решения.

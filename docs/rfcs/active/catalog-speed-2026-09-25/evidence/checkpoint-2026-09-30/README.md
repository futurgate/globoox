---
type: report
status: prepared
owner: library
last_verified: 2026-09-30
---

# Промежуточный frontend выпуск

Пользователь разрешил исправить небольшие остатки и выпустить dev на production. Проверенный кандидат включает dev bb2e016 и main8a3c257 (mergec3c82a4), без изменений backend/БД.

Изменения:5секунд на общую цепочку identity/activity/manifest; share только в явномURL, обычная гостеваяполка не зависит от прежнейссылки; Reader/back/auth/ошибкаOAuth сохраняют безопасный локальный next. Старый bookmark shared Reader безshare потребуется открыть через исходный /s/token. Cooldown остаётся10секунд от подтверждённойпроверки, без продления на пустомreload.

Проверено:333unit,3cataloghook,10Readercover/scope,5Readererror/retry; productionwebpack/TypeScript; независимыйreview. ДваinitialDOMharnessfail были вызваныopaqueabout:blank безsecurecrypto/storage и преждевременным наблюдениемпослеSuspense; исправлено окружениетеста, assertions сохранены. Вполнерабочий публичныйReaderdev:3страницывперёд,1назад,reload восстановилтуже31%страницу. Это оригиналEN и существующийlive dev, не доказательство восстановленияошибокперевода.

Остаются:общие main/dev streamed translation block errors и неполнаявидимостьстадий в аналитике. Личная сессия вбраузере сейчасguest; signed-inlive smoke ожидает входа пользователя, account/share guards проверены синтетически. Локальный production UI прошёл public6→shared1→Reader→reload→Backshared1→MyBookspublic6→reload; ответmanifestза3185мс безошибки, timeoutк5284мс, Retry315мс. [Точные UIнаблюдения](browser-before-publish.json), [проверки иsourcefingerprints](verification.json). Постдеплойфакты будут записаны отдельно после исполнения.

[Исходныеdeployment/rollbackданные](deployment-before.json). Выпуск требует Production build с productionenv: Previewнепродвигается. Дляодного Gitrelease main=true; послеуспешнойпроверки вернётсяconfig-onlymain=false. RollbackчерезGit:возвратproducttree к8a3c257, main=trueдляоткатнойсборки, затемпроверкадоменов иmain=false. Это новаясборка прежнегоGitmain с текущимиenv, не обещаниеоднокнопочногопереключения настарыйruntime235ddff.

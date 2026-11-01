# Ақша трекері — APK жинау

## Әдіс 1: GitHub арқылы (Android Studio керек емес)
1. github.com-та тегін аккаунт ашыңыз, жаңа repository жасаңыз.
2. Осы папканың ішіндегі БАРЛЫҚ файлдарды (.github папкасын қоса) repository-ге жүктеңіз.
3. Repository → Actions → "Build APK" → Run workflow.
4. 3-5 минуттан кейін аяқталған run ішінен "aksha-trekeri-apk" артефактын жүктеңіз.
5. Ішіндегі app-debug.apk файлын телефонға салып, орнатыңыз ("Белгісіз көздерден орнатуға" рұқсат беріңіз).

## Әдіс 2: Компьютерде (Android Studio + Node.js)
npm install
npx cap add android
npx cap sync android
npx cap open android   # Android Studio ашылады → Build > Build APK(s)

Қолданба коды: www/index.html

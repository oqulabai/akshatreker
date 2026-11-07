// cleanup-android.mjs
// Ақша трекері (Capacitor) жобасын тазалайды. Жоба түбірінде іске қос:
//
//     node cleanup-android.mjs
//
// Не істейді:
//   1. AndroidManifest.xml: INTERNET рұқсатын алады (қолданба желіге шықпайды),
//      VIBRATE рұқсатын қосады (index.html-дегі navigator.vibrate жұмыс істеуі үшін).
//   2. styles.xml: ақ splash суретінің орнына қара фон түсін қояды (#080A14).
//   3. 10-11 splash.png файлын жояды (тек styles.xml-ден басқа ешкім қолданбаса).
//
// Қайта іске қосса зиян жоқ: орындалған қадамды өткізіп жібереді.
// Күтпеген нәрсе көрсе, ол қадамды өзгертпей, ескерту шығарады.

import fs from 'node:fs';
import path from 'node:path';

const MAIN = 'android/app/src/main';
const RES = `${MAIN}/res`;
const manifestPath = `${MAIN}/AndroidManifest.xml`;
const stylesPath = `${RES}/values/styles.xml`;
const colorsPath = `${RES}/values/splash_colors.xml`;
const SPLASH_COLOR = '#080A14'; // қолданбаның қара фонымен бірдей (theme-color)

const ok = (m) => console.log('  ✔ ' + m);
const warn = (m) => console.log('  ⚠ ' + m);

if (!fs.existsSync(manifestPath)) {
  console.error('android/ папкасы табылмады. Скриптті Capacitor жобасының түбірінде іске қос.');
  process.exit(1);
}

// ---------- 1. Манифест ----------
console.log('1) AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');
const internetRe = /[ \t]*<uses-permission\s+android:name="android\.permission\.INTERNET"\s*\/>[ \t]*\r?\n?/;
if (internetRe.test(manifest)) {
  manifest = manifest.replace(internetRe, '');
  ok('INTERNET рұқсаты алынды');
} else {
  ok('INTERNET рұқсаты бұрыннан жоқ');
}
if (!manifest.includes('android.permission.VIBRATE')) {
  if (manifest.includes('</manifest>')) {
    manifest = manifest.replace(
      '</manifest>',
      '    <uses-permission android:name="android.permission.VIBRATE" />\n</manifest>'
    );
    ok('VIBRATE рұқсаты қосылды');
  } else {
    warn('</manifest> табылмады, VIBRATE қосылмады');
  }
} else {
  ok('VIBRATE рұқсаты бұрыннан бар');
}
fs.writeFileSync(manifestPath, manifest);

// ---------- 2. Splash түсі ----------
console.log('2) Splash түсі (styles.xml)');
let splashDone = false;
if (fs.existsSync(stylesPath)) {
  let styles = fs.readFileSync(stylesPath, 'utf8');
  const bgRe = /<item name="android:background">@drawable\/splash<\/item>/;
  if (bgRe.test(styles)) {
    styles = styles.replace(
      bgRe,
      '<item name="android:background">@color/splash_bg</item>\n' +
        '        <item name="windowSplashScreenBackground">@color/splash_bg</item>'
    );
    fs.writeFileSync(stylesPath, styles);
    ok('styles.xml: splash суреті түске ауыстырылды');
    splashDone = true;
  } else if (styles.includes('@color/splash_bg')) {
    ok('styles.xml бұрыннан түзетілген');
    splashDone = true;
  } else {
    warn('styles.xml-де "@drawable/splash" жолы табылмады. Splash-қа тиіспедім.');
  }
} else {
  warn('styles.xml табылмады. Splash-қа тиіспедім.');
}
if (splashDone) {
  fs.writeFileSync(
    colorsPath,
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="splash_bg">${SPLASH_COLOR}</color>\n</resources>\n`
  );
  ok(`splash_colors.xml жазылды (${SPLASH_COLOR})`);
}

// ---------- 3. splash.png файлдарын жою ----------
console.log('3) splash.png файлдары');
if (splashDone) {
  // splash-ты басқа жерде қолданбайтынына көз жеткіз
  const stillUsed = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(xml|java|kt)$/.test(e.name)) {
        const t = fs.readFileSync(p, 'utf8');
        if (/@drawable\/splash\b|R\.drawable\.splash\b/.test(t)) stillUsed.push(p);
      }
    }
  };
  walk(MAIN);
  if (stillUsed.length) {
    warn('splash әлі қолданылады, файлдарды жойған жоқпын: ' + stillUsed.join(', '));
  } else {
    let n = 0;
    for (const d of fs.readdirSync(RES)) {
      if (!d.startsWith('drawable')) continue;
      const f = path.join(RES, d, 'splash.png');
      if (fs.existsSync(f)) {
        fs.unlinkSync(f);
        n++;
      }
    }
    ok(n ? `${n} splash.png файлы жойылды` : 'splash.png файлдары бұрыннан жоқ');
  }
} else {
  warn('2-қадам орындалмағандықтан, файлдарды жойған жоқпын');
}

console.log('\nДайын. Енді: npx cap sync android → Android Studio-да қайта жина.');

// ---------- 4. Қолданба белгішесі (иконка) ----------
console.log('4) Қолданба белгішесі');
if (fs.existsSync('icons')) {
  let copied = 0;
  for (const d of fs.readdirSync('icons')) {
    const from = path.join('icons', d), to = path.join(RES, d);
    if (!fs.statSync(from).isDirectory()) continue;
    fs.mkdirSync(to, { recursive: true });
    for (const f of fs.readdirSync(from)) { fs.copyFileSync(path.join(from, f), path.join(to, f)); copied++; }
  }
  const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_bg"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  const v26 = path.join(RES, 'mipmap-anydpi-v26');
  if (fs.existsSync(v26)) {
    for (const n of ['ic_launcher.xml', 'ic_launcher_round.xml']) fs.writeFileSync(path.join(v26, n), adaptive);
    ok(`белгіше файлдары көшірілді (${copied}), адаптивті иконка жаңартылды`);
  } else {
    warn('mipmap-anydpi-v26 табылмады: тек кәдімгі белгіше ауыстырылды');
  }
} else {
  warn('icons/ папкасы жоқ: белгішеге тиіспедім');
}

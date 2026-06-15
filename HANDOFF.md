# מסמך המשכיות - קטלוג זיקית דיגיטל

> אל תמחקי את הקובץ הזה - כל המידע החשוב כאן.

---

## 🎯 סטטוס נוכחי (סוף הסשן הנוכחי)

| מה | מצב |
|---|---|
| מסד נתונים Supabase | ✅ פעיל, 199 מוצרים |
| ממשק קטלוג ציבורי | ✅ עובד מקומית |
| ממשק ניהול | ✅ עובד עם התחברות |
| חישוב מחירים אוטומטי | ✅ ספק × 1.18 × 1.30 |
| מחיר מכירה ידני + אחוז רווח | ✅ הוטמע (אם הרצת את המיגרציה) |
| תמונות מוצרים | 🟡 63 מתוך 199 |
| העלאה ל-Netlify | ⏳ לא הועלה עדיין |

---

## 🔐 פרטי גישה - שמרי בעצמך!

### Supabase
- **URL:** `https://sviudpjkhvfoxmggdlyx.supabase.co`
- **דאשבורד:** https://supabase.com/dashboard/project/sviudpjkhvfoxmggdlyx
- **התחברות:** המייל שאיתו פתחת את החשבון
- **משתמש ניהול לאתר:**
  - אימייל: `tamar@hoffmann.co.il`
  - סיסמה: `Tamar2026!` (אפשר לשנות דרך SQL)

### Anon Key (כבר בקבצי האתר):
```
sb_publishable_a94W_Hvm4bDao27bpnAhXQ_u2WF7h7X
```

---

## 💻 איך ממשיכים מהבית - 3 צעדים

### צעד 1: סנכרון OneDrive
התיקייה `catalog-site` נמצאת ב-OneDrive שלך:
```
C:\Users\Tamar\OneDrive - CBT Center\אישי\Tamari\catalog-site\
```
**אם OneDrive מסונכרן במחשב הבית - הכל יהיה שם אוטומטית!**
(צריך לבדוק שהתיקייה אכן הורדה - לפעמים OneDrive מציין "Available when online" - בעלי קליק ימני ולבחור "Always keep on this device").

### צעד 2: בדיקה שהאתר עובד
דאבל-קליק על:
```
C:\Users\Tamar\OneDrive - CBT Center\אישי\Tamari\catalog-site\index.html
```
אמור להיפתח בדפדפן ולהציג 199 מוצרים. אם כן - האתר עובד מהבית גם!

### צעד 3: התקנת Python (רק אם רוצים להמשיך עם תמונות)
אם תרצי להמשיך לעבוד על תמונות מוצרים, תצטרכי להתקין Python על מחשב הבית:
1. https://www.python.org/downloads/
2. **חשוב לסמן ☑ Add python.exe to PATH** בהתקנה
3. אחר כך לפתוח PowerShell ולהריץ:
```
python -m pip install pypdfium2 supabase Pillow requests
```

---

## 📂 מבנה הפרויקט

```
catalog-site/
├── index.html              ← קטלוג ציבורי
├── admin.html              ← ניהול
├── README.md               ← מדריך התקנה כללי
├── HANDOFF.md              ← הקובץ הזה
├── schema.sql              ← הסכמה הראשית של DB
│
├── css/styles.css          ← עיצוב
├── js/
│   ├── supabase-client.js  ← הגדרות חיבור + חישוב מחירים
│   ├── catalog.js          ← לוגיקת קטלוג
│   └── admin.js            ← לוגיקת ניהול
│
├── data/
│   ├── seed-products.sql       ← 42 מוצרי דוגמה (אצווה 1) - כבר נטען ל-DB
│   ├── seed-batch-2.sql        ← 157 מוצרים (אצווה 2) - כבר נטען ל-DB
│   ├── migration-manual-price.sql ← הוספת מחיר ידני - האם הרצת?
│   ├── product-images/         ← תמונות מוצרים חתוכות
│   └── page-images/            ← תמונות עמודים מלאות
│
└── scripts/
    ├── extract_smart_crop.py        ← הסקריפט הראשי לחילוץ תמונות
    ├── extract_and_upload.py        ← גרסה ישנה - מעמודים שלמים
    ├── extract_by_quadrant.py       ← גרסה אמצעית - לפי רבעים
    └── extract_product_images.py    ← גרסה ראשונית
```

---

## 🚧 מה נשאר לעשות (לפי סדר עדיפויות)

### 🔥 העדיפות הראשונה לשבוע הבא: GitHub + Netlify לסנכרון מלא
**המטרה:** לעבוד על האתר מכל מחשב, בכל מקום, בלי לסחוב קבצים.

**מה זה כולל:**
1. יצירת חשבון GitHub חינמי (אם אין כבר)
2. העלאת הפרויקט לרפוזיטורי פרטי ב-GitHub
3. יצירת חשבון Netlify חינמי
4. חיבור Netlify ל-GitHub - **כל שינוי שתעשי בקוד מעדכן את האתר אוטומטית**
5. קבלת כתובת ציבורית (כמו `zikit-catalog.netlify.app`)

**הרווח:** אחרי זה, בכל מחשב את:
- נכנסת לאתר עצמו דרך הדפדפן → ניהול מוצרים, תמונות, מחירים ✅
- (אופציונלי) `git clone` הפרויקט מ-GitHub אם רוצה לערוך קוד

---

### עדיפות גבוהה (אחרי GitHub + Netlify)
1. **לוודא שהרצת `migration-manual-price.sql`** ב-Supabase SQL Editor
   - אם לא ידוע - הריצי שאילתה: `select column_name from information_schema.columns where table_name='products' and column_name='manual_sale_price';`
   - אם תוצאה ריקה → צריך להריץ את המיגרציה
   - אם יש שורה אחת → כבר הרצת

2. **השלמת תמונות חסרות** (136 מוצרים)
   - דרך admin: חיפוש לפי מק"ט → ערוך → העלאת תמונה
   - בערך 30 שניות למוצר → ~70 דקות עבודה למיון

### עדיפות בינונית
3. **הרצת עוד אצוות מוצרים מה-PDF** (אם נמצאו עוד עמודים)
   - בפועל גילינו שה-PDF הוא 157 עמודים, וטענו ~199 מוצרים מתוכם
   - יכולים להיות עוד מוצרים שלא קלטנו

### עדיפות נמוכה / עתידי
4. שדות עתידיים שכבר קיימים בסכמה אבל ריקים: מלאי, שטח הדפסה, זמן/טמפ' כבישה, הערות
5. דומיין משלך (במקום `xxx.netlify.app`)
6. דף "אודות"/"צור קשר"

---

## 🔧 פקודות שימושיות

### לבדוק כמה מוצרים יש עם תמונות:
ב-Supabase SQL Editor:
```sql
select
  count(*) as total,
  count(image_url) as with_image,
  count(*) - count(image_url) as missing_image
from products;
```

### לאפס סיסמה של משתמש הניהול:
```sql
update auth.users
set encrypted_password = crypt('NewPassword123!', gen_salt('bf'))
where email = 'tamar@hoffmann.co.il';
```

### לשנות אחוז המע"מ או הרווח לכל המוצרים (אם המדינה משנה):
ערכי בקובץ `js/supabase-client.js`:
```js
const VAT_RATE    = 18;   // אחוז מע"מ
const MARGIN_RATE = 30;   // אחוז רווח
```

---

## 📞 איך לחזור אליי

כשתפתחי שיחה חדשה איתי בשבוע הבא, פשוט תכתבי:
> "ממשיכים עם הקטלוג של זיקית דיגיטל. תקרא את HANDOFF.md בתיקיה C:\Users\Tamar\OneDrive - CBT Center\אישי\Tamari\catalog-site\"

ואני אקרא את הקובץ הזה ואדע בדיוק איפה אנחנו ומה צריך לעשות.

---

**מסמך נוצר ב-11.06.2026**

# Project Rules

## Deployment Constraints
- **CRITICAL:** Gələcək hər hansı bir dəyişiklikdən sonra canlı mühitə (`npm run deploy` və ya `gcloud run deploy` vasitəsilə) deploy etməzdən əvvəl mütləq istifadəçidən açıq şəkildə icazə və təsdiq soruşulmalıdır. İstifadəçi təsdiq vermədən heç bir deploy əmri icra edilə bilməz.
- **CRITICAL:** Deploy tamamlandıqdan sonra canlı mühit üzərində hər hansı avtomatlaşdırılmış brauzer testini (subagent və s.) başlatmazdan əvvəl mütləq istifadəçidən əvvəlcə icazə və təsdiq alınmalıdır.
- **CRITICAL:** Cavablarda istifadəçiyə hər dəfə hansı kodların dəyişdirildiyini (kod diff-ləri, uzun kod blokları və s.) göstərmə, yalnız qısa məntiqi icmal ver və fayl linklərini təqdim et.


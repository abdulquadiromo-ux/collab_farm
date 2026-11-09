# Image slots

The Figma photographs could not be exported while building (the Figma image host was unreachable from the build
environment), so the app renders generated placeholders through `src/components/common/Photo.jsx`.

To use the real photography, export the images from Figma and drop them in this folder with these names. No code
change is needed. A missing file simply falls back to the placeholder.

| File name | Used on | Figma frame |
|---|---|---|
| `auth-handshake.jpg` | Login and Create account left panel | Authentication, "Image" 6046:1012 |
| `hero-farm.jpg` | Landing hero background | Hero Container 6021:3629 |
| `explore-associations.jpg` | Landing, Explore Our Platform, Associations tile | 6017:441 |
| `explore-investors.jpg` | Landing, Investors tile (vineyard rows) | 6017:441 |
| `verification-farmers.jpg` | Landing, Secure Identity Verification | 6017:533 |
| `why-choose-us.jpg` | Landing, Why Choose Us wide photo | 6017:555 |
| `cta-field.jpg` | Landing, final call to action | 6017:578 |
| `package-crop.jpg` | Package detail banner (seedling in hand) | Funding Packages 7841:14830 |
| `farmer-avatar.jpg` | Optional default farmer portrait | Farmers Directory 6050:2492 |

Farmer avatars in tables use initials on a tinted circle by default.

The landing hero photo is “Farmer at harvest” by Photobyamin, depicting a Nigerian rice farmer,
from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Farmer_at_harvest.jpg),
licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

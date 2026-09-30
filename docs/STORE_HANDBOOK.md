# TINDA POS — Store Handbook

Ang tuto ba ngan sa tindahan. Isang dokumento para sa lahat: **cashier**, **store owner**, at **master admin**.

Buksan ang app sa `https://tindapos-web.pages.dev`. Gumamit sa cellphone, tablet, o computer — walang kailangang i-install.

---

## 1. Mga Role (Anong kaya ng bawat isa)

| Role | Sino | Ano ang magagawa |
|---|---|---|
| **Cashier** | Ang nagsa-counter | Sell, mag-utang, mag-restock, X-Read, mag-close ng shift |
| **Inventory Lead** | Ang nag-i-ingat ng stocks | Cashier + suppliers, expiration, bulk stock edit |
| **Store Owner / Admin** | Ang may-ari | Lahat ng cashier + expenses, settings, backup, user accounts |
| **Master Admin** | Ang platform owner | Lahat + Master Control (tanang store, tanang user) |

Alinman sa role, **tandaan**: ang app ay gumagana rin kahit walang internet. Nagse-save ang lahat sa mismong device mo. Pag bumalik ang internet, mag-sync nang automatic.

---

## 2. Araw-araw na Daloy (Unang Araw)

### 2.1 Gumawa ng account
1. Buksan ang app. Pindutin ang **Sign Up**.
2. Punan ang **Store Name** — ito ang lalabas sa resibo.
3. Punan ang iyong **Name**, **Username**, at **4-digit PIN**.
4. Pindutin ang **Create Account**.

Pag ginawa mo ito, ikaw ang **Owner** ng store mo.

> **Pin:** 4 lamang ang numero. Mahirap itong i-crack pero wag mo itong isulat sa malalagong lugar. Wag mo ring ibahagi kahit kanino — **malalaki ang problema ng isang leaking PIN** kaysa sa lahat ng ibang sistema.

### 2.2 I-set up ang store
Pumunta sa **Settings** → punan ang:
- **Store Name** — lalabas sa resibo
- **Contact Number** at **Address** — sa resibo rin
- **Receipt Footer** — mensaheng gusto mong makita sa ibaba ng resibo ("Salamat sa inyo!" etc.)
- **Printer Paper Width** — **58mm** (maliit na resibo) o **80mm** (mas malaki). Itanong sa printer mo kung alin ang tama.
- **Default Low Stock** — magiging **5** para sa karamihan

Pindutin ang **Save**.

---

## 3. Bawat Araw — Cashier

### 3.1 Simulan ang shift (Opening Float)
1. **Log In** gamit ang username at PIN mo.
2. Papakain ng **Opening Float** — ang cash na simula mo para sa shift (default **₱2,000**).
3. Pindutin ang **Confirm**.

Nagsisimula na ang oras ng shift mo. Magsisimula na ring i-record ang lahat ng sales.

### 3.2 Pagbebenta
1. Pindutin ang **Counter**.
2. Hanapin ang produkto — type ang pangalan sa search box, o pindutin ang **Scan** para i-scan ang barcode.
3. Pindutin ang produkto para ilagay sa cart. Uulitin hanggang maliit na (**×**) para tanggalin.
4. Pindutin ang **Checkout**.

### 3.3 Checkout — pagtanggap ng bayad
Piliin ang paraan ng pagbabayad:

| Paraan | Kailan gamitin |
|---|---|
| **Cash** | Bayad ng papel |
| **E-Transfer** | GCash, Maya, bank transfer |
| **Store Credit (Utang)** | Kung ang customer bayad sa huli |

Tapos:
- **Cash** — i-type ang insulta nang ibinayad, tapos pindutin ang **Change**. Ipakita nang bayad sa customer ang sukli.
- **E-Transfer** — pindutin ang **Paid**, ilagay ang reference number kung mayroon.
- **Store Credit** — piliin ang customer mula sa listahan. **Kung wala pa sila, idagdag muna sila sa Customers.**

Pindutin ang **Print Receipt** para i-print, o **Done** para balik sa counter.

> **Tandaan:** Isang transaksyon kada checkout. Kung magbebenta ka ng maraming bagay sa isang customer, pumunta muna sila sa **Counter** para malagyan ng lahat bago mag-checkout.

### 3.4 Restock (Magdagdag ng stock)
May dalawang paraan:

**A. Mula sa Dashboard (mabilis)**
1. Pumunta sa **Dashboard**.
2. Hanapin ang produkto sa **Low Stock** section.
3. Pindutin ang **Restock**, i-type ang dami, at pindutin ang **Confirm**.

**B. Mula sa Inventory (buong listahan)**
1. Pumunta sa **Inventory**.
2. Pindutin ang produkto.
3. Pindutin ang **Restock**, i-type ang dami, pindutin ang **Save**.

Pag na-restock mo, **agad na nababawasan** ang stock — hindi mo na kailangang i-refresh.

### 3.5 X-Read (Mid-Day Check)
Pumunta sa **Analytics & Z-Read** → **X-Reading**.

Ito ang "kita ngayon, hindi pa natatapos araw" — para makita mong magkano na ang benta at magkano na ang nasa drawera **bago ka mag-shift**.

Pindutin ang **Print** para may resibong maaaring pumasa sa manager.

### 3.6 Isara ang araw (Z-Read)
**Dito napupunta ang lahat ng pera ng araw.** Gawin mo iton sa dulo ng araw, bago ka umalis.

1. Pumunta sa **Analytics & Z-Read** → **Z-Reading**.
2. Kuneksa ang lahat ng pera. Ang app ay mag-count ng bawat denomination:
   - Baryo: ₱1, ₱5, ₱10, ₱20, ₱50, ₱100, ₱200, ₱500, ₱1000
   - Barya: 25¢, ₱1, ₱5, ₱10
3. Ilagay ang bawat bilang saCash Count.
4. Itulak ang **Cash on Hand** — ang aktuwal na laman ng drawera mo.
5. Pindutin ang **Save Z-Read**.

Ang app ay mag-compute at mag-tanaw ng:
- **Total Sales** — lahat ng kinita
- **Cash Sales, E-Transfer, Utang** — dinivided
- **Expenses** — kinuha sa store
- **Expected Drawer** — dapat ayon sa bilang mo
- **Variance** — **kung hindi zero, may discrepancy.** Itanong sa owner ka agad, bago isara.

> **Ang X-Read at Z-Read:** pareho ang computation. Ang kaibha lang — ang X-Read ay **paggawa ng tanaw** para makita ang kalagayan, habang ang Z-Read ay **pagsasara ng araw** — ito ang official na record.

### 3.7 Log Out
Pindutin ang **Log Out** sa ibaba ng menu. Nalilinig nito ang cart at lumalabas sa terminal.

> **Hindi ito ang pagtatapos ng shift.** Ang Z-Read (§3.6) ang nagtatapos ng araw. Ang Log Out ay para lang magpalabas ng iba mula sa terminal mo.

### 3.8 Kung naubos ang oras (Shift Pass)
Kapag na-expire na ang store shift pass, **ma-lock ang buong app** — walang makakapag-transact hanggang ma-redeem.

Ang paraan:
1. Pindutin ang **Watch Ad** para makakuha ng token.
2. Pindutin ang **Unlock** para i-redeem ang token.
3. Awitin ang timer, saka makakapagtrabaho ulit.

Gawin ito **bago mag-ubos** ang oras — hindi sa gitna ng mataa na customer.

---

## 4. Store Owner / Admin

Lahat ng kayang gawin ng cashier, plus ang mga ito:

### 4.1 Manage ng User Accounts
Pumunta sa **Settings** → **User Accounts**.

- **Add Staff / Cashier** — gumawa ng account para sa kaso mong staff. Itanong kung kanino: cashier, inventory lead, o admin.
- **Edit** — palitan ang pangalan, role, o status.
- **Toggle status** — i-activate o i-deactivate. **Mas mabuting i-deactivate kaysa burahin.** Kapag umalis na ang tao, i-deactivate para ma-preserve ang records nila. Kung burahin mo, mawawala ang lahat ng sales history nila.

### 4.2 Expenses
Pumunta sa **Expenses**.

Itala ang mga bayarin sa store: pas electricity, tubig, transport, pang maintenance, etc.

- Pindutin ang **Add Expense**
- Piliin ang category (o gumawa ng bago)
- Itala ang petsa, halaga, at note
- **Save**

Nakalalagay ito sa Z-Read para malaman mo ang **tunay na kita**, hindi lang ang gross sales.

### 4.3 Customer Credit (Utang)
Pumunta sa **Customers & Credit**.

- **Add Customer** — pangalan, contact, at **credit limit** (ang pinakamalaking pautang mo sa kanya).
- Kapag nag-utang: pumunta sa **Utang** tab, piliin ang customer, **Add Charge**.
- Kapag nagbayad: piliin ang customer, **Record Payment**.

Laging **tingnan ang balance** ng customer. Kung lampas na sa limit, sabihin sa owner.

### 4.4 Suppliers
Pumunta sa **Suppliers**.

Itala ang mga supplier mo: pangalan, contact, address. Mahalaga ito para alam mo kung saan ka magrerehistro kung may problema sa delivery.

### 4.5 Backup ang Data
Pumunta sa **Settings** → **Backup & Export**.

- **Export .tinda-backup** — i-download ang **isang file** ng buong store: products, sales, customers, at kahit mga photos.
- **Import Backup** — i-restore mula sa dating backup file.

> **Gawin ito kada linggo.** I-save ang file sa Google Drive o sa isa mong device. Kapag nawala ang phone o nawala ang app, **ito lang ang makapagse-save sa iyo**.

Ang backup ay **`.tinda-backup`** file — hindi Excel. Para mag-import muli: click ang file, piliin, tapos **Save**.

---

## 5. Master Admin

### 5.1 Master Control Console
Pumunta sa **Master Control** (mukha sa navigation, may **ROOT** badge).

Dito nakikita mo ang:
- **Lahat ng store** — aktibong users, sales, tokens, at online status
- **Realtime Status** — kung sino ang online ngayon
- **Ads & Tokens** — expiry, tokens, at ads watched kada store
- **Enter Store** — pumasok sa POS ng isang store bilang siya (masquerade), para makita mo mismo ang kalagayan nito

Mga aksyon:
- **1-Click VIP Time Grant** — dagdagan ang oras ng store. **+1 Day (24h)**, **+7 Days (1wk)**, o **+30 Days (1mo)**. Binibypass nito ang ads.
- **Grant Tokens to Store Wallet** — **+3 Tokens (1d)** o **+9 Tokens (3d)**. Ito ang binabayaran ng ads.
- **Add Store** — magre-register ng bagong store.
- **Manage Pass** — i-set ang pass ng isang store.

> **Eksklusivo ito sa iyo.** Hindi ito dapat gamitin ng cashier o ng owner ng store. Ang **Enter Store** ay nakikita nang malinaw na ginagawa mo ang ginagawa ng store owner — gamitin lamang kung may problema kang sinusuri.

---

## 6. Mga Shortcut at Mga Tip

### Bawat Araw — Checklist ng Cashier
- [ ] Log in, ilagay ang opening float
- [ ] Benta, lahat ng customer
- [ ] Restock kada may bagong dating
- [ ] X-Read sa lunch
- [ ] Z-Read + kuwentahin ang pera sa dulo
- [ ] Log out

### Mga Sikat na Problema

| Problema | Ayusin |
|---|---|
| "Nakalimutan ko ang PIN" | Owner/admin ang makakatulong. Hindi ito mababawi nang automated. |
| "Di gumagana ang printer" | Settings → Paper Width. Siguraduhin 58mm o 80mm ang tama. |
| "Nawala ang internet" | **Normal.** Gumagana pa rin ang app. I-save lang kapag bumalik. |
| "May kulang ang pera sa drawer" | **Huwag itong ayusin nang solo.** Sabihin sa owner. Itala sa Z-Read notes. |
| "May maling stock" | Inventory → Restock → **ADJUSTMENT**. Huwag i-edit ang number nang diretsohang. |
| "Nawala ang data" | Settings → Import Backup. Kailangan mo ang JSON file. |

### Mga Tandaan Para sa Lahat
1. **Wag mag-click ng Log Out hangga't hindi ka tapos na sa shift.** Mawawala ang in-progress na shift.
2. **X-Read kada hating araw.** Kung may nawala, mabuha mo kayo ng tanaw kung kailan.
3. **Kung may variance sa Z-Read, isulat sa notes.** Transparency = walang problema.
4. **Wag ibahagi ang account.** Isang tao, isang account. Share-an ang store, hindi ang login.

---

## 7. Contact

| May tanong sa? | Kailangan mo ba ng |
|---|---|
| Sales, stock, utang, Z-Read | Store owner o admin |
| User account, backup, settings | Store owner o admin |
| Pro access, tokens, ads | Master Admin |
| May bug o naka-crash | Master Admin |

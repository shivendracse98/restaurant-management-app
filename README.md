## 🍴 **TasteTown – Restaurant Management Web App**

### 🚀 Overview

**TasteTown** is a full-featured restaurant management system built using **Angular 17** and **JSON Server** (mock backend).
It supports multiple roles — **Admin**, **Staff**, and **Customer** — with real-time menu management, order tracking, and tiffin subscription handling.

---

### 🧩 **Core Features**

#### 👨‍💼 Admin

* Manage menu items (create, edit, delete)
* View and manage all orders
* Track payments & analytics dashboard

#### 👩‍🍳 Staff

* POS (Point of Sale) interface for dine-in/takeaway
* Manage tiffin subscriptions
* View today’s and ongoing orders
* Revenue summary with daily analytics

#### 🧑‍🍽️ Customer

* Browse menu and place orders
* Manage cart and order history
* Subscribe to tiffin plans
* Secure authentication & profile management

---

### ⚙️ **Tech Stack**

* **Frontend:** Angular 17 (Standalone Components, TypeScript, SCSS)
* **Mock Backend:** JSON Server (`db.json`)
* **Charts:** ng2-charts (Chart.js)
* **Routing & Guards:** Angular Router, Auth/Admin/Staff Guards
* **Authentication:** Role-based with session persistence
* **UI:** Custom SCSS (modern, minimal, and luxurious theme)

---

### 🧠 **Project Structure**

```
src/
├── app/
│   ├── core/                # Core services & guards
│   ├── features/            # Feature modules (admin, staff, customer)
│   │   ├── admin/
│   │   ├── staff/
│   │   ├── customer/
│   ├── models/              # Data models
│   ├── app.component.*      # Root component
│   ├── app.routes.ts        # Routing configuration
│
├── assets/                  # Images and static assets
├── environments/            # Environment configurations
└── db.json                  # Mock API data for JSON Server
```

---

### 🧾 **Setup Instructions**

1. **Clone Repository**

   ```bash
   git clone https://Shivendra1998@bitbucket.org/Shivendra1998/restaurant-management-app.git
   cd restaurant-management-app
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Run Mock Backend**

   ```bash
   npx json-server --watch db.json --port 3000
   ```

4. **Start Angular App**

   ```bash
   ng serve
   ```

5. **Open in Browser**

   ```
   http://localhost:4200
   ```

---

### 🧭 **Upcoming Enhancements**

* [ ] Complete Payment Management for Admin
* [ ] Advanced Menu Management UI
* [ ] Enhanced Role-Based Analytics Dashboard
* [ ] Cloud Backend (Spring Boot / Node)
* [ ] Deployed Production Version

---

### 👨‍💻 **Author**

**Shivendra Yadav**
📧 [[shivendraydv98@gmail.com](mailto:shivendraydv98@gmail.com)]
🌐 Bitbucket: [Shivendra1998](https://bitbucket.org/Shivendra1998/)

---

### 💎 **License**

This project is licensed under the **MIT License**.

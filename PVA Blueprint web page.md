All code on this page is accurate to every color schema that pva is this is the perfect color scheme make sure if you code or build anything that is has this code below as this is the blueprint when designing anything for pva  \<\!DOCTYPE html\>  
\<html lang\="en"\>  
\<head\>  
    \<meta charset\="UTF-8"\>  
    \<meta name\="viewport" content\="width=device-width, initial-scale=1.0"\>  
    \<title\>My Portfolio | PVA Bazaar\</title\>  
    \<link rel\="stylesheet" href\="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"\>  
    \<link href\="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700\&family=Poppins:wght@400;500;600;700\&display=swap" rel\="stylesheet"\>  
    \<link rel\="stylesheet" href\="/public/css/pva-nav.css"\>  
    \<script src\="https://cdn.jsdelivr.net/npm/chart.js"\>\</script\>  
    \<style\>  
        :root {  
            \--primary-dark: \#0f3b2d;  
            \--primary: \#1c5a45;  
            \--primary-light: \#2d7d5a;  
            \--accent: \#4ef8a3;  
            \--accent-dark: \#2bb673;  
            \--gold: \#d4af37;  
            \--text-light: \#e8f4f0;  
            \--text-muted: \#a8b0b9;  
            \--card-bg: rgba(18, 18, 18, 0.95);  
            \--card-border: rgba(42, 75, 42, 0.6);  
            \--gradient-start: \#4ef8a3;  
            \--gradient-mid: \#2bb673;  
            \--gradient-end: \#1c5a45;  
        }

        \* {  
            margin: 0;  
            padding: 0;  
            box-sizing: border-box;  
            font-family: 'Poppins', Tahoma, Geneva, Verdana, sans-serif;  
        }  
         
        body {  
            background: \#0a0a0a;  
            color: var(\--text-light);  
            min-height: 100vh;  
            padding: 20px;  
            background-image:  
                radial-gradient(circle at 25% 25%, rgba(28, 90, 69, 0.15) 0%, transparent 40%),  
                radial-gradient(circle at 75% 75%, rgba(28, 90, 69, 0.15) 0%, transparent 40%);  
            overflow-x: hidden;  
        }  
         
        .container {  
            max-width: 1400px;  
            margin: 0 auto;  
        }  
         
        /\* Header Styles \*/  
        header {  
            display: flex;  
            justify-content: space-between;  
            align-items: center;  
            padding: 20px 0;  
            margin-bottom: 30px;  
            border-bottom: 1px solid var(\--primary);  
            position: relative;  
        }  
         
        .logo {  
            display: flex;  
            align-items: center;  
            gap: 15px;  
            text-decoration: none;  
        }  
         
        .logo-icon {  
            font-size: 32px;  
            color: var(\--accent);  
        }  
         
        .logo-text {  
            font-size: 28px;  
            font-weight: 700;  
            color: var(\--text-light);  
            font-family: 'Playfair Display', serif;  
        }  
         
        .user-nav {  
            display: flex;  
            align-items: center;  
            gap: 30px;  
        }  
         
        nav {  
            display: flex;  
            gap: 25px;  
        }  
         
        nav a {  
            color: var(\--text-muted);  
            text-decoration: none;  
            font-weight: 500;  
            transition: color 0.3s;  
            position: relative;  
        }  
         
        nav a:hover, nav a.active {  
            color: var(\--accent);  
        }  
         
        nav a.active::after {  
            content: '';  
            position: absolute;  
            bottom: \-5px;  
            left: 0;  
            width: 100%;  
            height: 2px;  
            background: var(\--accent);  
            border-radius: 2px;  
        }  
         
        .user-profile {  
            display: flex;  
            align-items: center;  
            gap: 10px;  
            cursor: pointer;  
            position: relative;  
        }  
         
        .user-avatar {  
            width: 40px;  
            height: 40px;  
            border-radius: 50%;  
            background: var(\--primary);  
            display: flex;  
            align-items: center;  
            justify-content: center;  
            color: var(\--accent);  
            font-weight: 600;  
            position: relative;  
        }  
         
        .notification-badge {  
            position: absolute;  
            top: \-5px;  
            right: \-5px;  
            background: var(\--gold);  
            color: \#000;  
            font-size: 10px;  
            width: 18px;  
            height: 18px;  
            border-radius: 50%;  
            display: flex;  
            align-items: center;  
            justify-content: center;  
            font-weight: 700;  
        }  
         
        .user-name {  
            color: var(\--text-light);  
            font-weight: 500;  
        }  
         
        /\* Dashboard Layout \*/  
        .dashboard {  
            display: grid;  
            grid-template-columns: 300px 1fr;  
            gap: 30px;  
            margin-bottom: 50px;  
        }  
         
        @media (max-width: 1100px) {  
            .dashboard {  
                grid-template-columns: 1fr;  
            }  
             
            .sidebar {  
                display: none;  
            }  
        }  
         
        /\* Sidebar \*/  
        .sidebar {  
            background: var(\--card-bg);  
            border: 1px solid var(\--card-border);  
            border-radius: 12px;  
            padding: 25px;  
            height: fit-content;  
            backdrop-filter: blur(10px);  
            position: relative;  
            overflow: hidden;  
        }  
         
        .sidebar::before {  
            content: '';  
            position: absolute;  
            top: 0;  
            left: 0;  
            right: 0;  
            height: 1px;  
            background: linear-gradient(90deg,  
                transparent,  
                var(\--accent),  
                transparent  
            );  
            animation: borderShine 3s infinite linear;  
        }  
         
        .sidebar-title {  
            color: var(\--gold);  
            font-size: 1.5rem;  
            margin-bottom: 25px;  
            font-family: 'Playfair Display', serif;  
            padding-bottom: 15px;  
            border-bottom: 1px solid var(\--primary);  
        }  
         
        .sidebar-menu {  
            list-style: none;  
        }  
         
        .menu-item {  
            margin-bottom: 15px;  
            opacity: 0;  
            transform: translateX(\-20px);  
            animation: fadeInLeft 0.5s forwards;  
        }  
         
        .menu-item:nth-child(1) { animation-delay: 0.1s; }  
        .menu-item:nth-child(2) { animation-delay: 0.2s; }  
        .menu-item:nth-child(3) { animation-delay: 0.3s; }  
        .menu-item:nth-child(4) { animation-delay: 0.4s; }  
        .menu-item:nth-child(5) { animation-delay: 0.5s; }  
        .menu-item:nth-child(6) { animation-delay: 0.6s; }  
        .menu-item:nth-child(7) { animation-delay: 0.7s; }  
         
        .menu-link {  
            display: flex;  
            align-items: center;  
            gap: 15px;  
            color: var(\--text-muted);  
            text-decoration: none;  
            padding: 12px 15px;  
            border-radius: 8px;  
            transition: all 0.3s;  
        }  
         
        .menu-link:hover, .menu-link.active {  
            background: rgba(28, 90, 69, 0.3);  
            color: var(\--accent);  
        }  
         
        .menu-icon {  
            width: 20px;  
            text-align: center;  
        }  
         
        /\* Main Dashboard Content \*/  
        .dashboard-main {  
            display: flex;  
            flex-direction: column;  
            gap: 30px;  
        }  
         
        .welcome-banner {  
            background: linear-gradient(120deg, var(\--primary-dark), var(\--primary));  
            border-radius: 12px;  
            padding: 30px;  
            display: flex;  
            justify-content: space-between;  
            align-items: center;  
            position: relative;  
            overflow: hidden;  
        }  
         
        .welcome-banner::before {  
            content: '';  
            position: absolute;  
            top: 0;  
            left: 0;  
            width: 100%;  
            height: 100%;  
            background: linear-gradient(45deg,  
                transparent 0%,  
                rgba(255, 255, 255, 0.1) 50%,  
                transparent 100%);  
            animation: shine 5s infinite linear;  
        }  
         
        .welcome-text h1 {  
            color: var(\--text-light);  
            font-size: 2rem;  
            margin-bottom: 10px;  
            font-family: 'Playfair Display', serif;  
        }  
         
        .welcome-text p {  
            color: var(\--text-muted);  
            max-width: 600px;  
        }  
         
        .welcome-actions {  
            display: flex;  
            gap: 15px;  
            z-index: 2;  
        }  
         
        .action-btn {  
            padding: 12px 20px;  
            background: rgba(255, 255, 255, 0.1);  
            color: var(\--text-light);  
            border: 1px solid rgba(255, 255, 255, 0.2);  
            border-radius: 8px;  
            cursor: pointer;  
            transition: all 0.3s;  
            display: flex;  
            align-items: center;  
            gap: 8px;  
            backdrop-filter: blur(10px);  
        }  
         
        .action-btn:hover {  
            background: var(\--accent);  
            color: var(\--primary-dark);  
        }  
         
        /\* Portfolio Overview \*/  
        .portfolio-overview {  
            display: grid;  
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));  
            gap: 20px;  
            margin-bottom: 30px;  
        }  
         
        .stat-card {  
            background: var(\--card-bg);  
            border: 1px solid var(\--card-border);  
            border-radius: 12px;  
            padding: 25px;  
            text-align: center;  
            backdrop-filter: blur(10px);  
            position: relative;  
            overflow: hidden;  
            opacity: 0;  
            transform: translateY(20px);  
            animation: fadeInUp 0.5s forwards;  
        }  
         
        .stat-card:nth-child(1) { animation-delay: 0.1s; }  
        .stat-card:nth-child(2) { animation-delay: 0.2s; }  
        .stat-card:nth-child(3) { animation-delay: 0.3s; }  
        .stat-card:nth-child(4) { animation-delay: 0.4s; }  
         
        .stat-card::before {  
            content: '';  
            position: absolute;  
            top: \-2px;  
            left: \-2px;  
            right: \-2px;  
            bottom: \-2px;  
            z-index: \-1;  
            background: linear-gradient(45deg,  
                var(\--gradient-start),  
                var(\--gradient-mid),  
                var(\--gradient-end),  
                var(\--gradient-start));  
            background-size: 400% 400%;  
            border-radius: 14px;  
            animation: gradientBorder 6s ease infinite;  
        }  
         
        .stat-icon {  
            font-size: 2.5rem;  
            color: var(\--accent);  
            margin-bottom: 15px;  
        }  
         
        .stat-value {  
            color: var(\--accent);  
            font-size: 2rem;  
            font-weight: 700;  
            margin-bottom: 5px;  
        }  
         
        .stat-label {  
            color: var(\--text-muted);  
            font-size: 0.9rem;  
        }  
         
        .trend-indicator {  
            display: flex;  
            align-items: center;  
            justify-content: center;  
            gap: 5px;  
            margin-top: 10px;  
            font-size: 0.9rem;  
        }  
         
        .trend-up {  
            color: \#4ef8a3;  
        }  
         
        .trend-down {  
            color: \#ff6b6b;  
        }  
         
        /\* Portfolio Charts \*/  
        .charts-container {  
            display: grid;  
            grid-template-columns: 1fr 1fr;  
            gap: 25px;  
            margin-bottom: 30px;  
        }  
         
        @media (max-width: 900px) {  
            .charts-container {  
                grid-template-columns: 1fr;  
            }  
        }  
         
        .chart-card {  
            background: var(\--card-bg);  
            border: 1px solid var(\--card-border);  
            border-radius: 12px;  
            padding: 25px;  
            backdrop-filter: blur(10px);  
        }  
         
        .chart-header {  
            display: flex;  
            justify-content: space-between;  
            align-items: center;  
            margin-bottom: 20px;  
        }  
         
        .chart-title {  
            color: var(\--gold);  
            font-size: 1.3rem;  
            font-family: 'Playfair Display', serif;  
        }  
         
        .chart-actions {  
            display: flex;  
            gap: 10px;  
        }  
         
        .chart-action-btn {  
            background: transparent;  
            border: 1px solid var(\--primary);  
            color: var(\--text-muted);  
            padding: 5px 10px;  
            border-radius: 6px;  
            cursor: pointer;  
            font-size: 0.8rem;  
            transition: all 0.3s;  
        }  
         
        .chart-action-btn:hover, .chart-action-btn.active {  
            background: var(\--primary);  
            color: var(\--text-light);  
        }  
         
        .chart-container {  
            height: 250px;  
            position: relative;  
        }  
         
        /\* Asset Allocation \*/  
        .allocation-list {  
            list-style: none;  
            margin-top: 20px;  
        }  
         
        .allocation-item {  
            display: flex;  
            align-items: center;  
            justify-content: space-between;  
            padding: 12px 0;  
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);  
        }  
         
        .allocation-item:last-child {  
            border-bottom: none;  
        }  
         
        .allocation-info {  
            display: flex;  
            align-items: center;  
            gap: 15px;  
        }  
         
        .allocation-color {  
            width: 15px;  
            height: 15px;  
            border-radius: 50%;  
        }  
         
        .allocation-name {  
            color: var(\--text-light);  
            font-weight: 500;  
        }  
         
        .allocation-value {  
            color: var(\--text-light);  
            font-weight: 600;  
        }  
         
        .allocation-percentage {  
            color: var(\--text-muted);  
            font-size: 0.9rem;  
        }  
         
        /\* Holdings Section \*/  
        .section-title {  
            color: var(\--gold);  
            font-size: 1.8rem;  
            margin-bottom: 20px;  
            font-family: 'Playfair Display', serif;  
        }  
         
        .holdings-table {  
            width: 100%;  
            border-collapse: collapse;  
            background: var(\--card-bg);  
            border-radius: 12px;  
            overflow: hidden;  
            border: 1px solid var(\--card-border);  
            margin-bottom: 40px;  
            backdrop-filter: blur(10px);  
        }  
         
        .holdings-table th {  
            background: rgba(28, 90, 69, 0.3);  
            padding: 15px;  
            text-align: left;  
            color: var(\--accent);  
            font-weight: 600;  
        }  
         
        .holdings-table td {  
            padding: 15px;  
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);  
        }  
         
        .holdings-table tr:last-child td {  
            border-bottom: none;  
        }  
         
        .holdings-table tr {  
            transition: background 0.3s;  
        }  
         
        .holdings-table tr:hover {  
            background: rgba(28, 90, 69, 0.1);  
        }  
         
        .asset {  
            display: flex;  
            align-items: center;  
            gap: 15px;  
        }  
         
        .asset-icon {  
            width: 40px;  
            height: 40px;  
            border-radius: 8px;  
            background: var(\--primary);  
            display: flex;  
            align-items: center;  
            justify-content: center;  
            color: var(\--accent);  
            font-size: 1.2rem;  
        }  
         
        .asset-name {  
            color: var(\--text-light);  
            font-weight: 500;  
        }  
         
        .asset-symbol {  
            color: var(\--text-muted);  
            font-size: 0.8rem;  
        }  
         
        .price-change.positive {  
            color: \#4ef8a3;  
        }  
         
        .price-change.negative {  
            color: \#ff6b6b;  
        }  
         
        .action-cell {  
            display: flex;  
            gap: 10px;  
        }  
         
        .table-btn {  
            padding: 8px 12px;  
            border-radius: 6px;  
            font-size: 0.8rem;  
            cursor: pointer;  
            transition: all 0.3s;  
            border: none;  
        }  
         
        .btn-buy {  
            background: var(\--accent);  
            color: var(\--primary-dark);  
        }  
         
        .btn-sell {  
            background: transparent;  
            color: var(\--text-light);  
            border: 1px solid var(\--primary);  
        }  
         
        .btn-buy:hover {  
            opacity: 0.9;  
        }  
         
        .btn-sell:hover {  
            background: rgba(255, 107, 107, 0.2);  
            border-color: \#ff6b6b;  
        }  
         
        /\* Performance Section \*/  
        .performance-cards {  
            display: grid;  
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));  
            gap: 20px;  
            margin-bottom: 40px;  
        }  
         
        .performance-card {  
            background: var(\--card-bg);  
            border: 1px solid var(\--card-border);  
            border-radius: 12px;  
            padding: 25px;  
            text-align: center;  
            backdrop-filter: blur(10px);  
        }  
         
        .performance-icon {  
            font-size: 2rem;  
            color: var(\--accent);  
            margin-bottom: 15px;  
        }  
         
        .performance-title {  
            color: var(\--text-muted);  
            font-size: 0.9rem;  
            margin-bottom: 10px;  
        }  
         
        .performance-value {  
            color: var(\--text-light);  
            font-size: 1.8rem;  
            font-weight: 700;  
            margin-bottom: 5px;  
        }  
         
        .performance-comparison {  
            display: flex;  
            align-items: center;  
            justify-content: center;  
            gap: 5px;  
            font-size: 0.9rem;  
        }  
         
        /\* Transactions Section \*/  
        .transactions {  
            background: var(\--card-bg);  
            border: 1px solid var(\--card-border);  
            border-radius: 12px;  
            padding: 25px;  
            margin-bottom: 40px;  
            backdrop-filter: blur(10px);  
        }  
         
        .transaction-list {  
            list-style: none;  
        }  
         
        .transaction-item {  
            display: grid;  
            grid-template-columns: 2fr 1fr 1fr 1fr;  
            padding: 15px 0;  
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);  
        }  
         
        .transaction-item:last-child {  
            border-bottom: none;  
        }  
         
        .transaction-type {  
            display: flex;  
            align-items: center;  
            gap: 10px;  
        }  
         
        .type-icon {  
            width: 30px;  
            height: 30px;  
            border-radius: 50%;  
            display: flex;  
            align-items: center;  
            justify-content: center;  
        }  
         
        .type-icon.buy {  
            background: rgba(78, 248, 163, 0.2);  
            color: \#4ef8a3;  
        }  
         
        .type-icon.sell {  
            background: rgba(255, 107, 107, 0.2);  
            color: \#ff6b6b;  
        }  
         
        .transaction-asset {  
            font-weight: 500;  
        }  
         
        .transaction-date {  
            color: var(\--text-muted);  
        }  
         
        .transaction-amount {  
            font-weight: 600;  
        }  
         
        .transaction-status {  
            display: flex;  
            align-items: center;  
            gap: 5px;  
            font-size: 0.9rem;  
        }  
         
        .status-completed {  
            color: \#4ef8a3;  
        }  
         
        .status-pending {  
            color: var(\--gold);  
        }  
         
        /\* Footer \*/  
        footer {  
            text-align: center;  
            margin-top: 40px;  
            padding: 40px 20px;  
            border-top: 1px solid var(\--primary-dark);  
        }  
         
        .footer-logo {  
            font-size: 2rem;  
            font-weight: 700;  
            margin-bottom: 20px;  
            color: var(\--accent);  
            font-family: 'Playfair Display', serif;  
        }  
         
        .social-links {  
            display: flex;  
            justify-content: center;  
            gap: 15px;  
            margin-bottom: 20px;  
        }  
         
        .social-links a {  
            display: flex;  
            align-items: center;  
            justify-content: center;  
            width: 40px;  
            height: 40px;  
            border-radius: 50%;  
            background: rgba(28, 90, 69, 0.2);  
            color: var(\--text-light);  
            text-decoration: none;  
            transition: all 0.3s ease;  
        }  
         
        .social-links a:hover {  
            background: var(\--accent);  
            color: var(\--primary-dark);  
            transform: translateY(\-3px);  
        }  
         
        .copyright {  
            color: var(\--text-muted);  
            font-size: 0.9rem;  
        }  
         
        /\* Animations \*/  
        @keyframes fadeInUp {  
            from {  
                opacity: 0;  
                transform: translateY(20px);  
            }  
            to {  
                opacity: 1;  
                transform: translateY(0);  
            }  
        }  
         
        @keyframes fadeInLeft {  
            from {  
                opacity: 0;  
                transform: translateX(\-20px);  
            }  
            to {  
                opacity: 1;  
                transform: translateX(0);  
            }  
        }  
         
        @keyframes gradientBorder {  
            0% {  
                background-position: 0% 50%;  
            }  
            50% {  
                background-position: 100% 50%;  
            }  
            100% {  
                background-position: 0% 50%;  
            }  
        }  
         
        @keyframes shine {  
            0% {  
                transform: translateX(\-100%) rotate(45deg);  
            }  
            100% {  
                transform: translateX(200%) rotate(45deg);  
            }  
        }  
         
        @keyframes borderShine {  
            0% {  
                opacity: 0;  
                transform: translateX(\-100%);  
            }  
            50% {  
                opacity: 1;  
            }  
            100% {  
                opacity: 0;  
                transform: translateX(200%);  
            }  
        }  
         
        /\* Scrollbar Styling \*/  
        ::-webkit-scrollbar {  
            width: 8px;  
        }  
         
        ::-webkit-scrollbar-track {  
            background: rgba(15, 59, 45, 0.1);  
        }  
         
        ::-webkit-scrollbar-thumb {  
            background: var(\--primary);  
            border-radius: 4px;  
        }  
         
        ::-webkit-scrollbar-thumb:hover {  
            background: var(\--primary-light);  
        }  
    \</style\>  
\</head\>  
\<body\>  
    \<div class\="container"\>  
        \<header\>  
            \<a href\="\#" class\="logo"\>  
                \<i class\="fas fa-gem logo-icon"\>\</i\>  
                \<div class\="logo-text"\>PVA Bazaar\</div\>  
            \</a\>  
            \<div class\="user-nav"\>  
                                \<nav class\="pva-nav" aria-label\="Primary"\>  
                                        \<ul\>  
                                            \<li\>\<a href\="/pages/pvadashboard.html"\>Dashboard\</a\>\</li\>  
                                            \<li\>\<a href\="/pages/productshowcase.html"\>Marketplace\</a\>\</li\>  
                                            \<li\>\<a href\="/pages/portfolio.html"\>Portfolio\</a\>\</li\>  
                                            \<li\>\<a href\="/pages/checkoutmint.html"\>Checkout\</a\>\</li\>  
                                            \<li\>\<a href\="/pages/provenance.html"\>Provenance\</a\>\</li\>  
                                            \<li\>\<a href\="/pages/artifact.html"\>Artifact\</a\>\</li\>  
                                        \</ul\>  
                                \<script type\="module" src\="/src/pages/portfolio.js"\>\</script\>  
                                \<script type\="module" src\="/src/nav/inject-nav.js"\>\</script\>  
                                \</nav\>  
                \<div class\="user-profile"\>  
                    \<div class\="user-avatar"\>  
                        J  
                        \<div class\="notification-badge"\>3\</div\>  
                    \</div\>  
                    \<div class\="user-name"\>James Wilson\</div\>  
                \</div\>  
            \</div\>  
        \</header\>  
         
        \<div class\="dashboard"\>  
            \<\!-- Sidebar \--\>  
            \<div class\="sidebar"\>  
                \<h2 class\="sidebar-title"\>Portfolio\</h2\>  
                \<ul class\="sidebar-menu"\>  
                    \<li class\="menu-item"\>  
                        \<a href\="\#" class\="menu-link active"\>  
                            \<span class\="menu-icon"\>\<i class\="fas fa-chart-pie"\>\</i\>\</span\>  
                            \<span\>Overview\</span\>  
                        \</a\>  
                    \</li\>  
                    \<li class\="menu-item"\>  
                        \<a href\="\#" class\="menu-link"\>  
                            \<span class\="menu-icon"\>\<i class\="fas fa-coins"\>\</i\>\</span\>  
                            \<span\>Holdings\</span\>  
                        \</a\>  
                    \</li\>  
                    \<li class\="menu-item"\>  
                        \<a href\="\#" class\="menu-link"\>  
                            \<span class\="menu-icon"\>\<i class\="fas fa-exchange-alt"\>\</i\>\</span\>  
                            \<span\>Transactions\</span\>  
                        \</a\>  
                    \</li\>  
                    \<li class\="menu-item"\>  
                        \<a href\="\#" class\="menu-link"\>  
                            \<span class\="menu-icon"\>\<i class\="fas fa-chart-line"\>\</i\>\</span\>  
                            \<span\>Performance\</span\>  
                        \</a\>  
                    \</li\>  
                    \<li class\="menu-item"\>  
                        \<a href\="\#" class\="menu-link"\>  
                            \<span class\="menu-icon"\>\<i class\="fas fa-wallet"\>\</i\>\</span\>  
                            \<span\>Wallet\</span\>  
                        \</a\>  
                    \</li\>  
                    \<li class\="menu-item"\>  
                        \<a href\="\#" class\="menu-link"\>  
                            \<span class\="menu-icon"\>\<i class\="fas fa-cog"\>\</i\>\</span\>  
                            \<span\>Settings\</span\>  
                        \</a\>  
                    \</li\>  
                    \<li class\="menu-item"\>  
                        \<a href\="\#" class\="menu-link"\>  
                            \<span class\="menu-icon"\>\<i class\="fas fa-sign-out-alt"\>\</i\>\</span\>  
                            \<span\>Logout\</span\>  
                        \</a\>  
                    \</li\>  
                \</ul\>  
            \</div\>  
             
            \<\!-- Main Content \--\>  
            \<div class\="dashboard-main"\>  
                \<\!-- Welcome Banner \--\>  
                \<div class\="welcome-banner"\>  
                    \<div class\="welcome-text"\>  
                        \<h1\>Portfolio Overview\</h1\>  
                        \<p\>Your portfolio is up 3.2% in the last 7 days. You currently own shares in 4 premium assets.\</p\>  
                    \</div\>  
                    \<div class\="welcome-actions"\>  
                        \<button class\="action-btn"\>  
                            \<i class\="fas fa-download"\>\</i\> Export Report  
                        \</button\>  
                        \<button class\="action-btn"\>  
                            \<i class\="fas fa-sync-alt"\>\</i\> Refresh Data  
                        \</button\>  
                    \</div\>  
                \</div\>  
                 
                \<\!-- Portfolio Overview \--\>  
                \<div class\="portfolio-overview"\>  
                    \<div class\="stat-card"\>  
                        \<div class\="stat-icon"\>  
                            \<i class\="fas fa-wallet"\>\</i\>  
                        \</div\>  
                        \<div class\="stat-value"\>$8,425.75\</div\>  
                        \<div class\="stat-label"\>Portfolio Value\</div\>  
                        \<div class\="trend-indicator trend-up"\>  
                            \<i class\="fas fa-arrow-up"\>\</i\> 3.2%  
                        \</div\>  
                    \</div\>  
                     
                    \<div class\="stat-card"\>  
                        \<div class\="stat-icon"\>  
                            \<i class\="fas fa-chart-line"\>\</i\>  
                        \</div\>  
                        \<div class\="stat-value"\>$1,245.50\</div\>  
                        \<div class\="stat-label"\>Total Profit\</div\>  
                        \<div class\="trend-indicator trend-up"\>  
                            \<i class\="fas fa-arrow-up"\>\</i\> 12.8%  
                        \</div\>  
                    \</div\>  
                     
                    \<div class\="stat-card"\>  
                        \<div class\="stat-icon"\>  
                            \<i class\="fas fa-gem"\>\</i\>  
                        \</div\>  
                        \<div class\="stat-value"\>4\</div\>  
                        \<div class\="stat-label"\>Assets Owned\</div\>  
                        \<div class\="trend-indicator"\>  
                            \<i class\="fas fa-minus"\>\</i\> 0%  
                        \</div\>  
                    \</div\>  
                     
                    \<div class\="stat-card"\>  
                        \<div class\="stat-icon"\>  
                            \<i class\="fas fa-coins"\>\</i\>  
                        \</div\>  
                        \<div class\="stat-value"\>12,485\</div\>  
                        \<div class\="stat-label"\>PVA Coins\</div\>  
                        \<div class\="trend-indicator trend-up"\>  
                            \<i class\="fas fa-arrow-up"\>\</i\> 5.7%  
                        \</div\>  
                    \</div\>  
                \</div\>  
                 
                \<\!-- Charts \--\>  
                \<div class\="charts-container"\>  
                    \<div class\="chart-card"\>  
                        \<div class\="chart-header"\>  
                            \<h3 class\="chart-title"\>Portfolio Performance\</h3\>  
                            \<div class\="chart-actions"\>  
                                \<button class\="chart-action-btn active"\>1W\</button\>  
                                \<button class\="chart-action-btn"\>1M\</button\>  
                                \<button class\="chart-action-btn"\>3M\</button\>  
                                \<button class\="chart-action-btn"\>1Y\</button\>  
                            \</div\>  
                        \</div\>  
                        \<div class\="chart-container"\>  
                            \<canvas id\="performanceChart"\>\</canvas\>  
                        \</div\>  
                    \</div\>  
                     
                    \<div class\="chart-card"\>  
                        \<div class\="chart-header"\>  
                            \<h3 class\="chart-title"\>Asset Allocation\</h3\>  
                            \<div class\="chart-actions"\>  
                                \<button class\="chart-action-btn active"\>Value\</button\>  
                                \<button class\="chart-action-btn"\>Percentage\</button\>  
                            \</div\>  
                        \</div\>  
                        \<div class\="chart-container"\>  
                            \<canvas id\="allocationChart"\>\</canvas\>  
                        \</div\>  
                         
                        \<ul class\="allocation-list"\>  
                            \<li class\="allocation-item"\>  
                                \<div class\="allocation-info"\>  
                                    \<div class\="allocation-color" style\="background: \#4ef8a3;"\>\</div\>  
                                    \<div class\="allocation-name"\>Precious Gems\</div\>  
                                \</div\>  
                                \<div class\="allocation-details"\>  
                                    \<div class\="allocation-value"\>$2,850.00\</div\>  
                                    \<div class\="allocation-percentage"\>33.8%\</div\>  
                                \</div\>  
                            \</li\>  
                            \<li class\="allocation-item"\>  
                                \<div class\="allocation-info"\>  
                                    \<div class\="allocation-color" style\="background: \#2bb673;"\>\</div\>  
                                    \<div class\="allocation-name"\>Luxury Watches\</div\>  
                                \</div\>  
                                \<div class\="allocation-details"\>  
                                    \<div class\="allocation-value"\>$2,460.00\</div\>  
                                    \<div class\="allocation-percentage"\>29.2%\</div\>  
                                \</div\>  
                            \</li\>  
                            \<li class\="allocation-item"\>  
                                \<div class\="allocation-info"\>  
                                    \<div class\="allocation-color" style\="background: \#1c5a45;"\>\</div\>  
                                    \<div class\="allocation-name"\>Fine Art\</div\>  
                                \</div\>  
                                \<div class\="allocation-details"\>  
                                    \<div class\="allocation-value"\>$2,750.00\</div\>  
                                    \<div class\="allocation-percentage"\>32.6%\</div\>  
                                \</div\>  
                            \</li\>  
                            \<li class\="allocation-item"\>  
                                \<div class\="allocation-info"\>  
                                    \<div class\="allocation-color" style\="background: \#d4af37;"\>\</div\>  
                                    \<div class\="allocation-name"\>Other\</div\>  
                                \</div\>  
                                \<div class\="allocation-details"\>  
                                    \<div class\="allocation-value"\>$365.75\</div\>  
                                    \<div class\="allocation-percentage"\>4.4%\</div\>  
                                \</div\>  
                            \</li\>  
                        \</ul\>  
                    \</div\>  
                \</div\>  
                 
                \<\!-- Holdings Section \--\>  
                \<h2 class\="section-title"\>Your Holdings\</h2\>  
                \<table class\="holdings-table"\>  
                    \<thead\>  
                        \<tr\>  
                            \<th\>Asset\</th\>  
                            \<th\>Value\</th\>  
                            \<th\>Ownership\</th\>  
                            \<th\>24h Change\</th\>  
                            \<th\>Actions\</th\>  
                        \</tr\>  
                    \</thead\>  
                    \<tbody\>  
                        \<tr\>  
                            \<td\>  
                                \<div class\="asset"\>  
                                    \<div class\="asset-icon"\>  
                                        \<i class\="fas fa-gem"\>\</i\>  
                                    \</div\>  
                                    \<div\>  
                                        \<div class\="asset-name"\>Amradjet Emerald Pendant\</div\>  
                                        \<div class\="asset-symbol"\>GEM-8245\</div\>  
                                    \</div\>  
                                \</div\>  
                            \</td\>  
                            \<td\>$625.00\</td\>  
                            \<td\>12.5%\</td\>  
                            \<td class\="price-change positive"\>\+2.3%\</td\>  
                            \<td class\="action-cell"\>  
                                \<button class\="table-btn btn-buy"\>Buy\</button\>  
                                \<button class\="table-btn btn-sell"\>Sell\</button\>  
                            \</td\>  
                        \</tr\>  
                        \<tr\>  
                            \<td\>  
                                \<div class\="asset"\>  
                                    \<div class\="asset-icon"\>  
                                        \<i class\="fas fa-clock"\>\</i\>  
                                    \</div\>  
                                    \<div\>  
                                        \<div class\="asset-name"\>Vintage Rolex Submariner\</div\>  
                                        \<div class\="asset-symbol"\>WCH-5192\</div\>  
                                    \</div\>  
                                \</div\>  
                            \</td\>  
                            \<td\>$2,460.00\</td\>  
                            \<td\>8.2%\</td\>  
                            \<td class\="price-change positive"\>\+1.7%\</td\>  
                            \<td class\="action-cell"\>  
                                \<button class\="table-btn btn-buy"\>Buy\</button\>  
                                \<button class\="table-btn btn-sell"\>Sell\</button\>  
                            \</td\>  
                        \</tr\>  
                        \<tr\>  
                            \<td\>  
                                \<div class\="asset"\>  
                                    \<div class\="asset-icon"\>  
                                        \<i class\="fas fa-paint-brush"\>\</i\>  
                                    \</div\>  
                                    \<div\>  
                                        \<div class\="asset-name"\>"Sunset Horizon" Oil Painting\</div\>  
                                        \<div class\="asset-symbol"\>ART-3671\</div\>  
                                    \</div\>  
                                \</div\>  
                            \</td\>  
                            \<td\>$2,750.00\</td\>  
                            \<td\>5.5%\</td\>  
                            \<td class\="price-change positive"\>\+3.1%\</td\>  
                            \<td class\="action-cell"\>  
                                \<button class\="table-btn btn-buy"\>Buy\</button\>  
                                \<button class\="table-btn btn-sell"\>Sell\</button\>  
                            \</td\>  
                        \</tr\>  
                        \<tr\>  
                            \<td\>  
                                \<div class\="asset"\>  
                                    \<div class\="asset-icon"\>  
                                        \<i class\="fas fa-wine-bottle"\>\</i\>  
                                    \</div\>  
                                    \<div\>  
                                        \<div class\="asset-name"\>Rare Whisky Collection\</div\>  
                                        \<div class\="asset-symbol"\>COL-9283\</div\>  
                                    \</div\>  
                                \</div\>  
                            \</td\>  
                            \<td\>$365.75\</td\>  
                            \<td\>2.8%\</td\>  
                            \<td class\="price-change negative"\>\-0.8%\</td\>  
                            \<td class\="action-cell"\>  
                                \<button class\="table-btn btn-buy"\>Buy\</button\>  
                                \<button class\="table-btn btn-sell"\>Sell\</button\>  
                            \</td\>  
                        \</tr\>  
                    \</tbody\>  
                \</table\>  
                 
                \<\!-- Performance Metrics \--\>  
                \<div class\="performance-cards"\>  
                    \<div class\="performance-card"\>  
                        \<div class\="performance-icon"\>  
                            \<i class\="fas fa-trophy"\>\</i\>  
                        \</div\>  
                        \<div class\="performance-title"\>Total Return\</div\>  
                        \<div class\="performance-value"\>\+18.7%\</div\>  
                        \<div class\="performance-comparison trend-up"\>  
                            \<i class\="fas fa-arrow-up"\>\</i\> \+2.4% vs. benchmark  
                        \</div\>  
                    \</div\>  
                     
                    \<div class\="performance-card"\>  
                        \<div class\="performance-icon"\>  
                            \<i class\="fas fa-shield-alt"\>\</i\>  
                        \</div\>  
                        \<div class\="performance-title"\>Volatility\</div\>  
                        \<div class\="performance-value"\>12.3%\</div\>  
                        \<div class\="performance-comparison trend-down"\>  
                            \<i class\="fas fa-arrow-down"\>\</i\> \-3.1% vs. benchmark  
                        \</div\>  
                    \</div\>  
                     
                    \<div class\="performance-card"\>  
                        \<div class\="performance-icon"\>  
                            \<i class\="fas fa-balance-scale"\>\</i\>  
                        \</div\>  
                        \<div class\="performance-title"\>Sharpe Ratio\</div\>  
                        \<div class\="performance-value"\>1.42\</div\>  
                        \<div class\="performance-comparison trend-up"\>  
                            \<i class\="fas fa-arrow-up"\>\</i\> \+0.18 vs. benchmark  
                        \</div\>  
                    \</div\>  
                     
                    \<div class\="performance-card"\>  
                        \<div class\="performance-icon"\>  
                            \<i class\="fas fa-chart-pie"\>\</i\>  
                        \</div\>  
                        \<div class\="performance-title"\>Diversification\</div\>  
                        \<div class\="performance-value"\>76%\</div\>  
                        \<div class\="performance-comparison"\>  
                            \<i class\="fas fa-minus"\>\</i\> Optimal range  
                        \</div\>  
                    \</div\>  
                \</div\>  
                 
                \<\!-- Recent Transactions \--\>  
                \<div class\="transactions"\>  
                    \<h2 class\="section-title"\>Recent Transactions\</h2\>  
                    \<ul class\="transaction-list"\>  
                        \<li class\="transaction-item"\>  
                            \<div class\="transaction-type"\>  
                                \<div class\="type-icon buy"\>  
                                    \<i class\="fas fa-arrow-down"\>\</i\>  
                                \</div\>  
                                \<div\>  
                                    \<div class\="transaction-asset"\>Amradjet Emerald Pendant\</div\>  
                                    \<div class\="transaction-date"\>Today, 10:24 AM\</div\>  
                                \</div\>  
                            \</div\>  
                            \<div\>5 shares\</div\>  
                            \<div class\="transaction-amount"\>$250.00\</div\>  
                            \<div class\="transaction-status status-completed"\>  
                                \<i class\="fas fa-check-circle"\>\</i\> Completed  
                            \</div\>  
                        \</li\>  
                         
                        \<li class\="transaction-item"\>  
                            \<div class\="transaction-type"\>  
                                \<div class\="type-icon sell"\>  
                                    \<i class\="fas fa-arrow-up"\>\</i\>  
                                \</div\>  
                                \<div\>  
                                    \<div class\="transaction-asset"\>Vintage Rolex Submariner\</div\>  
                                    \<div class\="transaction-date"\>Yesterday, 3:45 PM\</div\>  
                                \</div\>  
                            \</div\>  
                            \<div\>2 shares\</div\>  
                            \<div class\="transaction-amount"\>$615.00\</div\>  
                            \<div class\="transaction-status status-completed"\>  
                                \<i class\="fas fa-check-circle"\>\</i\> Completed  
                            \</div\>  
                        \</li\>  
                         
                        \<li class\="transaction-item"\>  
                            \<div class\="transaction-type"\>  
                                \<div class\="type-icon buy"\>  
                                    \<i class\="fas fa-arrow-down"\>\</i\>  
                                \</div\>  
                                \<div\>  
                                    \<div class\="transaction-asset"\>Rare Whisky Collection\</div\>  
                                    \<div class\="transaction-date"\>Oct 12, 11:30 AM\</div\>  
                                \</div\>  
                            \</div\>  
                            \<div\>3 shares\</div\>  
                            \<div class\="transaction-amount"\>$360.00\</div\>  
                            \<div class\="transaction-status status-completed"\>  
                                \<i class\="fas fa-check-circle"\>\</i\> Completed  
                            \</div\>  
                        \</li\>  
                         
                        \<li class\="transaction-item"\>  
                            \<div class\="transaction-type"\>  
                                \<div class\="type-icon buy"\>  
                                    \<i class\="fas fa-arrow-down"\>\</i\>  
                                \</div\>  
                                \<div\>  
                                    \<div class\="transaction-asset"\>"Sunset Horizon" Oil Painting\</div\>  
                                    \<div class\="transaction-date"\>Oct 10, 2:15 PM\</div\>  
                                \</div\>  
                            \</div\>  
                            \<div\>2.5% ownership\</div\>  
                            \<div class\="transaction-amount"\>$1,250.00\</div\>  
                            \<div class\="transaction-status status-completed"\>  
                                \<i class\="fas fa-check-circle"\>\</i\> Completed  
                            \</div\>  
                        \</li\>  
                    \</ul\>  
                \</div\>  
            \</div\>  
        \</div\>  
         
        \<footer\>  
            \<div class\="footer-logo"\>PVA Bazaar\</div\>  
            \<div class\="social-links"\>  
                \<a href\="\#"\>\<i class\="fab fa-twitter"\>\</i\>\</a\>  
                \<a href\="\#"\>\<i class\="fab fa-instagram"\>\</i\>\</a\>  
                \<a href\="\#"\>\<i class\="fab fa-discord"\>\</i\>\</a\>  
                \<a href\="\#"\>\<i class\="fab fa-github"\>\</i\>\</a\>  
            \</div\>  
            \<div class\="copyright"\>© 2025 PVA Bazaar. All rights reserved.\</div\>  
        \</footer\>  
    \</div\>

    \<script\>  
        // Initialize Charts  
        document.addEventListener('DOMContentLoaded', function() {  
            // Performance Chart  
            const perfCtx \= document.getElementById('performanceChart').getContext('2d');  
            const performanceChart \= new Chart(perfCtx, {  
                type: 'line',  
                data: {  
                    labels: \['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'\],  
                    datasets: \[{  
                        label: 'Portfolio Value',  
                        data: \[7800, 7950, 8100, 8250, 8320, 8420, 8425\],  
                        borderColor: '\#4ef8a3',  
                        backgroundColor: 'rgba(78, 248, 163, 0.1)',  
                        borderWidth: 2,  
                        fill: true,  
                        tension: 0.3,  
                        pointBackgroundColor: '\#4ef8a3',  
                        pointRadius: 4,  
                        pointHoverRadius: 6  
                    }\]  
                },  
                options: {  
                    responsive: true,  
                    maintainAspectRatio: false,  
                    plugins: {  
                        legend: {  
                            display: false  
                        }  
                    },  
                    scales: {  
                        y: {  
                            beginAtZero: false,  
                            grid: {  
                                color: 'rgba(255, 255, 255, 0.1)'  
                            },  
                            ticks: {  
                                color: '\#a8b0b9',  
                                callback: function(value) {  
                                    return '$' \+ value;  
                                }  
                            }  
                        },  
                        x: {  
                            grid: {  
                                color: 'rgba(255, 255, 255, 0.1)'  
                            },  
                            ticks: {  
                                color: '\#a8b0b9'  
                            }  
                        }  
                    }  
                }  
            });  
             
            // Allocation Chart  
            const allocCtx \= document.getElementById('allocationChart').getContext('2d');  
            const allocationChart \= new Chart(allocCtx, {  
                type: 'doughnut',  
                data: {  
                    labels: \['Precious Gems', 'Luxury Watches', 'Fine Art', 'Other'\],  
                    datasets: \[{  
                        data: \[33.8, 29.2, 32.6, 4.4\],  
                        backgroundColor: \[  
                            '\#4ef8a3',  
                            '\#2bb673',  
                            '\#1c5a45',  
                            '\#d4af37'  
                        \],  
                        borderWidth: 0,  
                        hoverOffset: 10  
                    }\]  
                },  
                options: {  
                    responsive: true,  
                    maintainAspectRatio: false,  
                    cutout: '70%',  
                    plugins: {  
                        legend: {  
                            display: false  
                        }  
                    }  
                }  
            });  
             
            // Add interactivity to chart period buttons  
            document.querySelectorAll('.chart-action-btn').forEach(btn \=\> {  
                btn.addEventListener('click', function() {  
                    document.querySelectorAll('.chart-action-btn').forEach(b \=\> {  
                        b.classList.remove('active');  
                    });  
                    this.classList.add('active');  
                     
                    // Here you would update the chart data based on the selected period  
                    // For demo purposes, we're just logging the action  
                    console.log('Selected period: ' \+ this.textContent);  
                });  
            });  
             
            // Animate elements on scroll  
            const animateOnScroll \= function() {  
                const elements \= document.querySelectorAll('.stat-card, .performance-card');  
                 
                elements.forEach(element \=\> {  
                    const position \= element.getBoundingClientRect();  
                     
                    // If element is in viewport  
                    if(position.top \< window.innerHeight && position.bottom \>= 0) {  
                        element.style.opacity \= '1';  
                        element.style.transform \= 'translateY(0)';  
                    }  
                });  
            };  
             
            // Initial animation  
            setTimeout(() \=\> {  
                animateOnScroll();  
            }, 500);  
             
            // Listen for scroll events  
            window.addEventListener('scroll', animateOnScroll);  
             
            // Table row hover effect  
            const tableRows \= document.querySelectorAll('.holdings-table tr');  
            tableRows.forEach(row \=\> {  
                row.addEventListener('mouseenter', function() {  
                    this.style.backgroundColor \= 'rgba(28, 90, 69, 0.1)';  
                });  
                 
                row.addEventListener('mouseleave', function() {  
                    this.style.backgroundColor \= '';  
                });  
            });  
             
            // Update values periodically to simulate live data  
            setInterval(() \=\> {  
                // Randomly update some values to simulate market changes  
                const values \= document.querySelectorAll('.stat-value');  
                if (values.length \> 0) {  
                    const currentValue \= parseFloat(values\[0\].textContent.replace('$', '').replace(',', ''));  
                    const change \= (Math.random() \- 0.5) \* 20; // Random change between \-10 and \+10  
                    const newValue \= currentValue \+ change;  
                     
                    values\[0\].textContent \= '$' \+ newValue.toFixed(2);  
                     
                    // Update trend indicator  
                    const trendIndicator \= document.querySelector('.trend-indicator');  
                    if (change \>= 0) {  
                        trendIndicator.innerHTML \= '\<i class="fas fa-arrow-up"\>\</i\> ' \+ (change/currentValue\*100).toFixed(2) \+ '%';  
                        trendIndicator.className \= 'trend-indicator trend-up';  
                    } else {  
                        trendIndicator.innerHTML \= '\<i class="fas fa-arrow-down"\>\</i\> ' \+ (change/currentValue\*100).toFixed(2) \+ '%';  
                        trendIndicator.className \= 'trend-indicator trend-down';  
                    }  
                }  
            }, 5000);  
        });  
    \</script\>  
    \<script type\="module" src\="/src/pages/portfolio.js"\>\</script\>  
    \<script src\="/public/js/pva-nav.js" defer\>\</script\>  
\</body\>  
\</html\>  

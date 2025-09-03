body { font-family: 'Poppins', sans-serif; background-color: #FEFBF9; }
        h1, h2, h3, .clock { font-family: 'Playfair Display', serif; }
        
        /* Common Form Styles */
        .form-input:focus, .form-select:focus, .form-checkbox:focus, button:focus-visible {
            outline: none;
            border-color: #d63384;
            box-shadow: 0 0 0 3px rgba(214, 51, 132, 0.2);
        }
        .form-checkbox {
            appearance: none; background-color: #fff; margin-right: 0.5em; color: currentColor; width: 1.15em;
            height: 1.15em; border: 0.15em solid #e2e8f0; border-radius: 0.25em; transform: translateY(-0.075em);
            display: grid; place-content: center; flex-shrink: 0;
        }
        .form-checkbox::before {
            content: ""; width: 0.65em; height: 0.65em; transform: scale(0); transition: 120ms transform ease-in-out;
            box-shadow: inset 1em 1em #d63384; transform-origin: bottom left;
            clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
        }
        .form-checkbox:checked::before { transform: scale(1); }
        
        /* Main App Tab Styles */
        .tab-btn.active { border-color: #d63384; color: #d63384; background-color: #fdf2f8; }
        .tab-btn { border-color: transparent; }
        .sub-tab-btn.active { background-color: #d63384; color: white; }

        /* Landing Page Hero Section */
        .hero-section-new {
             background-image: url('https://images.unsplash.com/photo-1519014816548-bf5fe059798b?q=80&w=2070&auto=format&fit=crop');
            background-size: cover;
            background-position: center;
        }
        .hero-overlay-new {
            background-color: rgba(254, 251, 249, 0.7); /* Light overlay */
        }


        /* Modal Animation */
        .modal { transition: opacity 0.3s ease, transform 0.3s ease; }
        .modal.hidden { opacity: 0; transform: scale(0.95); pointer-events: none; }

        /* Calendar Styles */
        #calendar {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
        }
        .calendar-day { min-height: 100px; cursor: pointer; }
        .calendar-day:hover { background-color: #fdf2f8; }
        .appointment-entry {
            background-color: #fce7f3; color: #be185d; padding: 4px; border-radius: 4px;
            font-size: 12px; margin-bottom: 2px; cursor: pointer; overflow: hidden;
            text-overflow: ellipsis; white-space: nowrap;
        }
        .tech-filter-btn.active { background-color: #db2777; color: white; }

        /* Service Accordion on Landing Page */
        .service-accordion .subcategory-list {
            max-height: 0;
            overflow: hidden;
            transition: max-height: 0.5s ease-in-out;
        }
        .service-accordion.open .subcategory-list {
            max-height: 1000px; /* Arbitrary large number */
        }
        .service-accordion.open .accordion-icon {
            transform: rotate(180deg);
        }
        .accordion-icon {
            transition: transform 0.3s ease;
        }

        /* Dashboard Styles */
        .dashboard-card {
            padding: 1.5rem;
            border-radius: 1rem;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }

        /* Notification Bell Styles */
        .notification-badge {
            position: absolute;
            top: -5px;
            right: -10px;
            background-color: #ef4444;
            color: white;
            border-radius: 50%;
            padding: 2px 6px;
            font-size: 10px;
            font-weight: bold;
            border: 2px solid white;
        }

        .notification-dropdown {
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-top: 10px;
            background-color: white;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
            width: 300px;
            z-index: 50;
            max-height: 400px;
            overflow-y: auto;
        }
        .notification-item {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #f3f4f6;
            font-size: 14px;
        }
        .notification-item:last-child {
            border-bottom: none;
        }
        
        /* Top Navigation Styles */
        .top-nav-btn {
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            transition: background-color 0.2s, color 0.2s;
            font-weight: 600; /* Make menu text bold */
        }
        .top-nav-btn:hover {
            background-color: #fdf2f8;
            color: #d63384;
        }
        .top-nav-btn.active {
            background-color: #d63384;
            color: white;
        }

        /* New styles for scrollable modals */
        .modal {
            overflow-y: auto; /* Enable vertical scrolling for the modal container */
            padding: 2rem 1rem; /* Add padding for small screens to prevent touching edges */
        }

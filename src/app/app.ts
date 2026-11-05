import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { LucideBell as Bell, LucideBuilding as Building2, LucideCalendarDays as CalendarDays, LucideCircleCheck as CheckCircle2, LucideChevronDown as ChevronDown, LucideCircleDollarSign as CircleDollarSign, LucideFileText as FileText, LucideLayoutDashboard as LayoutDashboard, LucideLogOut as LogOut, LucideEllipsis as MoreHorizontal, LucideMoon as Moon, LucidePlus as Plus, LucideSearch as Search, LucideSettings as Settings, LucideShieldCheck as ShieldCheck, LucideSun as Sun, LucideUserRound as UserRound, LucideUsers as Users, LucideUtensils as Utensils, LucideWrench as Wrench, LucideX as X } from '@lucide/angular';
import { Login } from './login/login';
import { ApiService, AdminUser, AuditEvent, AuthUser, UserRole, WorkspaceSettings } from './api.service';
import { forkJoin, switchMap } from 'rxjs';

interface ResidentRecord {
  id: string;
  name: string;
  unit: string;
  property: string;
  lease: string;
  payment: string;
  move: string;
  initials: string;
  tone: string;
  balance: string;
  email: string;
}

interface MaintenanceRecord {
  id: string;
  title: string;
  unit: string;
  priority: string;
  status: string;
  assignee: string;
  age: string;
}

interface MenuRecord {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  image: string;
}

interface OrderRecord {
  id: string;
  customer: string;
  table: string;
  items: string;
  total: string;
  status: string;
  time: string;
}

interface InvoiceRecord {
  label: string;
  detail: string;
  amount: string;
  status: string;
}

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  visits: number;
  lifetimeSpend: string;
  favoriteTable: string;
  favoriteItem: string;
}

@Component({
  imports: [DatePipe, ReactiveFormsModule, Bell, Building2, CalendarDays, CheckCircle2, ChevronDown, CircleDollarSign, FileText, LayoutDashboard, LogOut, MoreHorizontal, Moon, Plus, Search, Settings, ShieldCheck, Sun, UserRound, Users, Utensils, Wrench, X, Login],
  selector: 'app-root',
  styleUrls: ['./resident.css', './app-controls.css'],
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly api = inject(ApiService);
  protected readonly activeView = signal(this.labelForRoute(this.router.url));
  protected readonly isAuthenticated = signal(typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('rms_authenticated'));
  protected readonly currentUser = signal<AuthUser | null>(null);
  protected readonly showResidentModal = signal(false);
  protected readonly showMaintenanceModal = signal(false);
  protected readonly showInvoiceModal = signal(false);
  protected readonly showCustomerModal = signal(false);
  protected readonly showNotifications = signal(false);
  protected readonly darkMode = signal(false);
  protected readonly menuCategory = signal('Starters');
  protected readonly residentSearch = signal('');
  protected readonly selectedResident = signal('');
  protected readonly cartItems = signal<MenuRecord[]>([]);
  protected readonly selectedCustomerId = signal('');
  protected readonly cartTotal = computed(() => this.cartItems().reduce((sum, item) => sum + Number(item.price.replace(/[^\d]/g, '')), 0));
  protected readonly workspaceError = signal('');
  protected readonly successMessage = signal('');
  protected readonly isSavingSettings = signal(false);
  protected readonly isCreatingUser = signal(false);
  protected readonly adminUsers = signal<AdminUser[]>([]);
  protected readonly auditEvents = signal<AuditEvent[]>([]);
  protected readonly customers = signal<CustomerRecord[]>([]);
  protected readonly maintenanceForm = this.formBuilder.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    unit: ['', Validators.required],
    priority: ['Normal', Validators.required],
    assignee: ['Unassigned', Validators.required],
  });
  protected readonly invoiceForm = this.formBuilder.group({
    label: ['', Validators.required],
    detail: ['', Validators.required],
    amount: ['', Validators.required],
    status: ['0% collected', Validators.required],
  });
  protected readonly customerForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
  });
  protected readonly settingsForm = this.formBuilder.group({
    organizationName: ['Northstar Living', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    contactEmail: ['hello@northstarliving.example', [Validators.required, Validators.email]],
    currency: ['INR', Validators.required],
    timezone: ['Asia/Kolkata', Validators.required],
    emailNotifications: [true],
    maintenanceAlerts: [true],
    darkMode: [false],
  });
  protected readonly userForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(12)]],
    role: ['manager', Validators.required],
  });
  protected readonly residentForm = this.formBuilder.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    unit: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });
  protected readonly navigation = [
    { label: 'Dashboard', icon: LayoutDashboard }, { label: 'Residents', icon: Users },
    { label: 'Units & occupancy', icon: Building2 }, { label: 'Leases & billing', icon: FileText },
    { label: 'Maintenance', icon: Wrench }, { label: 'Reports', icon: CircleDollarSign },
    { label: 'Order menu', icon: Utensils }, { label: 'Order details', icon: FileText },
    { label: 'Customer details', icon: Users },
  ];
  protected readonly metrics = [
    { label: 'Occupied units', value: '184 / 212', change: '86.8%', detail: '12 move-ins this month', tone: 'mint', icon: Building2 },
    { label: 'Rent collected', value: '₹128,450', change: '+8.4%', detail: 'of ₹145,200 billed', tone: 'blue', icon: CircleDollarSign },
    { label: 'Open maintenance', value: '18', change: '4 urgent', detail: '6 resolved this week', tone: 'peach', icon: Wrench },
    { label: 'Renewals due', value: '12', change: 'Next 60 days', detail: '3 need attention', tone: 'lilac', icon: CalendarDays },
  ];
  protected readonly residents = signal<ResidentRecord[]>([
    { id: 'resident-1', name: 'Maya Thompson', unit: 'B-204', property: 'Parkview Heights', lease: 'Active', payment: 'Paid', move: 'Aug 12, 2023', initials: 'MT', tone: 'teal', balance: '₹0.00', email: 'maya@example.com' },
    { id: 'resident-2', name: 'James Wilson', unit: 'A-118', property: 'The Linden', lease: 'Renewal due', payment: 'Due in 3 days', move: 'Jun 04, 2022', initials: 'JW', tone: 'blue', balance: '₹1,240.00', email: 'james@example.com' },
    { id: 'resident-3', name: 'Priya Shah', unit: 'C-307', property: 'Parkview Heights', lease: 'Active', payment: 'Paid', move: 'Jan 19, 2024', initials: 'PS', tone: 'purple', balance: '₹0.00', email: 'priya@example.com' },
    { id: 'resident-4', name: 'Ethan Brooks', unit: 'D-102', property: 'Riverside Lofts', lease: 'Active', payment: 'Processing', move: 'Mar 26, 2024', initials: 'EB', tone: 'orange', balance: '₹860.00', email: 'ethan@example.com' },
  ]);
  protected readonly units = signal([
    { label: 'Occupied', value: 184, total: 212, tone: 'occupied' }, { label: 'Available', value: 18, total: 212, tone: 'available' }, { label: 'Maintenance', value: 6, total: 212, tone: 'maintenance' }, { label: 'Notice given', value: 4, total: 212, tone: 'notice' },
  ]);
  protected readonly maintenanceTickets = signal<MaintenanceRecord[]>([
    { id: 'MT-2048', title: 'Kitchen sink leaking', unit: 'B-204', priority: 'High', status: 'Assigned', assignee: 'Caleb R.', age: '22m ago' },
    { id: 'MT-2047', title: 'AC not cooling', unit: 'A-118', priority: 'Urgent', status: 'In progress', assignee: 'Northstar HVAC', age: '1h ago' },
    { id: 'MT-2043', title: 'Replace hallway light', unit: 'C-307', priority: 'Normal', status: 'New', assignee: 'Unassigned', age: '3h ago' },
  ]);
  protected readonly invoices = signal<InvoiceRecord[]>([
    { label: 'September rent roll', detail: 'Due Sep 01 · 212 units', amount: '₹145,200', status: '84% collected' },
    { label: 'Utility reimbursements', detail: 'Due Sep 15 · 48 residents', amount: '₹9,840', status: '76% collected' },
  ]);
  protected readonly menuItems = signal<MenuRecord[]>([
    { name: 'Garden herb toast', description: 'Sourdough, whipped ricotta, herbs and lemon oil', price: '₹999', category: 'Starters', image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=640&q=85' },
    { name: 'Crispy cauliflower bites', description: 'Spiced cauliflower, yogurt dip and coriander', price: '₹899', category: 'Starters', image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=640&q=85' },
    { name: 'Garlic prawns', description: 'Sauteed prawns, garlic butter, chilli and lemon', price: '₹1,499', category: 'Starters', image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=640&q=85' },
    { name: 'Avocado quinoa salad', description: 'Quinoa, avocado, greens, cucumber and lemon dressing', price: '₹1,099', category: 'Healthy choices', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=640&q=85' },
    { name: 'Grilled chicken protein bowl', description: 'Grilled chicken, brown rice, greens and hummus', price: '₹1,399', category: 'Healthy choices', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=640&q=85' },
    { name: 'Berry yogurt parfait', description: 'Greek yogurt, seasonal berries, oats and honey', price: '₹799', category: 'Healthy choices', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=640&q=85' },
    { name: 'Tuna avocado lettuce wraps', description: 'Fresh tuna, avocado, lettuce cups and sesame', price: '₹1,299', category: 'Healthy choices', image: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=640&q=85' },
    { name: 'Green detox smoothie', description: 'Spinach, apple, cucumber, lime and ginger', price: '₹699', category: 'Healthy choices', image: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&w=640&q=85' },
    { name: 'Crispy chicken burger', description: 'Spiced chicken, lettuce, tomato and house sauce', price: '₹1,199', category: 'Fast food', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=640&q=85' },
    { name: 'Classic cheeseburger', description: 'Beef patty, cheddar, caramelized onion and pickles', price: '₹1,299', category: 'Fast food', image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=640&q=85' },
    { name: 'Spicy chicken wings', description: 'Crispy wings tossed in chilli honey glaze', price: '₹1,099', category: 'Fast food', image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=640&q=85' },
    { name: 'Crispy fish burger', description: 'Golden fish fillet, lettuce, tartar sauce and brioche bun', price: '₹1,349', category: 'Fast food', image: 'https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&w=640&q=85' },
    { name: 'Margherita pizza', description: 'Tomato, fresh mozzarella, basil and olive oil', price: '₹1,249', category: 'Pizzas', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=640&q=85' },
    { name: 'Tandoori chicken pizza', description: 'Tandoori chicken, peppers, onion and mozzarella', price: '₹1,499', category: 'Pizzas', image: 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=640&q=85' },
    { name: 'Garden vegetable pizza', description: 'Mushrooms, peppers, olives, spinach and feta', price: '₹1,399', category: 'Pizzas', image: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=640&q=85&ixid=garden-veg' },
    { name: 'Pepperoni pizza', description: 'Tomato, mozzarella and crisp pepperoni slices', price: '₹1,599', category: 'Pizzas', image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=640&q=85' },
    { name: 'Four cheese pizza', description: 'Mozzarella, cheddar, parmesan and blue cheese', price: '₹1,549', category: 'Pizzas', image: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=640&q=85' },
    { name: 'Cucumber mint spritz', description: 'Cucumber, mint, lime and sparkling water', price: '₹599', category: 'Drinks', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=640&q=85' },
    { name: 'Mango lassi', description: 'Chilled mango, yogurt and cardamom', price: '₹499', category: 'Drinks', image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=640&q=85' },
    { name: 'House cold brew', description: 'Smooth roasted coffee served over ice', price: '₹499', category: 'Drinks', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=640&q=85' },
    { name: 'Masala chai', description: 'Black tea with milk, ginger, cardamom and cinnamon', price: '₹299', category: 'Drinks', image: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=640&q=85' },
    { name: 'Fresh lime soda', description: 'Lime, mint and sparkling soda served chilled', price: '₹349', category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=640&q=85' },
    { name: 'Strawberry iced tea', description: 'Black tea, strawberry, lemon and ice', price: '₹449', category: 'Drinks', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=640&q=85&ixid=strawberry-tea' },
    { name: 'Truffle parmesan fries', description: 'Crisp potatoes, parmesan and black truffle aioli', price: '₹849', category: 'Snacks', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=640&q=85' },
    { name: 'Loaded nachos', description: 'Corn chips, cheese, jalapeno, salsa and guacamole', price: '₹999', category: 'Snacks', image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=640&q=85' },
    { name: 'Crispy onion rings', description: 'Golden onion rings with smoked paprika dip', price: '₹699', category: 'Snacks', image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=640&q=85' },
    { name: 'Mozzarella sticks', description: 'Crispy cheese sticks with tomato herb dip', price: '₹799', category: 'Snacks', image: 'https://images.unsplash.com/photo-1548340748-6d2b7d7da280?auto=format&fit=crop&w=640&q=85' },
    { name: 'Masala potato wedges', description: 'Roasted potato wedges, chaat masala and mint dip', price: '₹649', category: 'Snacks', image: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?auto=format&fit=crop&w=640&q=85' },
    { name: 'Chicken seekh kebab', description: 'Minced chicken, herbs and spices grilled on skewers', price: '₹1,299', category: 'Kebabs', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=640&q=85' },
    { name: 'Tandoori paneer tikka', description: 'Marinated paneer, peppers and onion from the tandoor', price: '₹1,099', category: 'Kebabs', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=640&q=85' },
    { name: 'Lamb shami kebab', description: 'Tender lamb, lentils, mint and warm spices', price: '₹1,499', category: 'Kebabs', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=640&q=85' },
    { name: 'Mutton boti kebab', description: 'Char-grilled mutton pieces, peppers and mint chutney', price: '₹1,699', category: 'Kebabs', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=640&q=85' },
    { name: 'Fish tikka kebab', description: 'Marinated fish, lemon, herbs and tandoori spices', price: '₹1,549', category: 'Kebabs', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=640&q=85' },
    { name: 'Herb roasted chicken', description: 'Free-range chicken, root vegetables and pan jus', price: '₹1,849', category: 'Meat mains', image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=640&q=85' },
    { name: 'Pepper steak', description: 'Grilled tenderloin, pepper sauce and roasted potatoes', price: '₹1,999', category: 'Meat mains', image: 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?auto=format&fit=crop&w=640&q=85' },
    { name: 'Butter chicken', description: 'Tandoori chicken in tomato, butter and cream gravy', price: '₹1,599', category: 'Meat mains', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=640&q=85' },
    { name: 'Lamb rogan josh', description: 'Slow-cooked lamb in Kashmiri spices and yogurt gravy', price: '₹1,899', category: 'Meat mains', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=640&q=85' },
    { name: 'Grilled fish steak', description: 'Seasonal fish, herb butter and roasted vegetables', price: '₹1,999', category: 'Meat mains', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=640&q=85' },
    { name: 'Roasted tomato soup', description: 'Slow-roasted tomatoes, basil oil and sourdough crisp', price: '₹749', category: 'Soups', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=640&q=85' },
    { name: 'Creamy chicken soup', description: 'Chicken, vegetables, herbs and silky cream broth', price: '₹899', category: 'Soups', image: 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?auto=format&fit=crop&w=640&q=85' },
    { name: 'Sweet corn soup', description: 'Sweet corn, spring onion, pepper and light broth', price: '₹699', category: 'Soups', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=640&q=85&ixid=sweet-corn-soup' },
    { name: 'Hot and sour soup', description: 'Mushrooms, tofu, vegetables and chilli vinegar', price: '₹749', category: 'Soups', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=640&q=85' },
    { name: 'Mushroom risotto', description: 'Wild mushrooms, parmesan and fresh thyme', price: '₹1,749', category: 'Vegetarian mains', image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=640&q=85' },
    { name: 'Palak paneer', description: 'Paneer, spinach, garlic and gentle Indian spices', price: '₹1,299', category: 'Vegetarian mains', image: 'https://loremflickr.com/640/480/palak,paneer?lock=103' },
    { name: 'Vegetable biryani', description: 'Basmati rice, vegetables, saffron and fried onion', price: '₹1,199', category: 'Vegetarian mains', image: 'https://loremflickr.com/640/480/biryani,vegetable?lock=104' },
    { name: 'Chocolate olive oil cake', description: 'Cocoa, sea salt and vanilla cream', price: '₹849', category: 'Desserts', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=640&q=85' },
    { name: 'Seasonal berry pavlova', description: 'Crisp meringue, whipped cream and fresh berries', price: '₹949', category: 'Desserts', image: 'https://images.unsplash.com/photo-1464195244916-405fa0a82545?auto=format&fit=crop&w=640&q=85' },
    { name: 'Gulab jamun cheesecake', description: 'Creamy cheesecake, gulab jamun and rose syrup', price: '₹1,099', category: 'Desserts', image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=640&q=85' },
    { name: 'Gulab jamun', description: 'Warm milk dumplings, saffron syrup and pistachio', price: '₹699', category: 'Desserts', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=640&q=85' },
    { name: 'Stuffed mushrooms', description: 'Roasted mushrooms, herbed cheese and breadcrumbs', price: '₹949', category: 'Starters', image: 'https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?auto=format&fit=crop&w=640&q=85' },
    { name: 'Bruschetta trio', description: 'Toasted bread with tomato, olive and pesto toppings', price: '₹899', category: 'Starters', image: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=640&q=85' },
    { name: 'Falafel bites', description: 'Crisp chickpea bites, tahini and pickled vegetables', price: '₹849', category: 'Starters', image: 'https://images.unsplash.com/photo-1593001874117-c99c800e3eb8?auto=format&fit=crop&w=640&q=85' },
    { name: 'Chicken satay', description: 'Grilled chicken skewers with peanut dipping sauce', price: '₹1,199', category: 'Starters', image: 'https://images.unsplash.com/photo-1529563021893-cc83c992d75d?auto=format&fit=crop&w=640&q=85' },
    { name: 'Corn cheese poppers', description: 'Sweet corn and cheese croquettes with salsa', price: '₹799', category: 'Starters', image: 'https://images.unsplash.com/photo-1548340748-6d2b7d7da280?auto=format&fit=crop&w=640&q=85' },
    { name: 'Cottage cheese skewers', description: 'Grilled paneer, peppers and mint yogurt', price: '₹999', category: 'Starters', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=640&q=85' },
    { name: 'Prawn tempura', description: 'Lightly battered prawns with chilli lime dip', price: '₹1,399', category: 'Starters', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=640&q=85' },
    { name: 'Lentil power salad', description: 'Green lentils, roasted vegetables, seeds and herbs', price: '₹999', category: 'Healthy choices', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=640&q=85' },
    { name: 'Quinoa sushi bowl', description: 'Quinoa, edamame, avocado and sesame soy dressing', price: '₹1,199', category: 'Healthy choices', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=640&q=85' },
    { name: 'Grilled tofu plate', description: 'Tofu, greens, roasted peppers and ginger dressing', price: '₹1,099', category: 'Healthy choices', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=640&q=85' },
    { name: 'Apple walnut salad', description: 'Crisp apple, walnuts, greens and honey mustard', price: '₹899', category: 'Healthy choices', image: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=640&q=85' },
    { name: 'Oat banana smoothie', description: 'Banana, oats, almond milk and cinnamon', price: '₹749', category: 'Healthy choices', image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=640&q=85' },
    { name: 'BBQ chicken wrap', description: 'Grilled chicken, slaw, barbecue sauce and lettuce', price: '₹1,099', category: 'Fast food', image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=640&q=85' },
    { name: 'Loaded chicken fries', description: 'Crisp fries, chicken, cheese sauce and jalapenos', price: '₹1,199', category: 'Fast food', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=640&q=85' },
    { name: 'Veggie burger', description: 'Crisp vegetable patty, lettuce, tomato and aioli', price: '₹999', category: 'Fast food', image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=640&q=85' },
    { name: 'Chicken hot dog', description: 'Grilled chicken sausage, mustard and crispy onions', price: '₹1,049', category: 'Fast food', image: 'https://images.unsplash.com/photo-1612392062631-94dd858cba88?auto=format&fit=crop&w=640&q=85' },
    { name: 'BBQ pulled chicken sandwich', description: 'Slow-cooked chicken, slaw and barbecue glaze', price: '₹1,149', category: 'Fast food', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=640&q=85' },
    { name: 'Chicken tikka pizza', description: 'Tikka chicken, onion, peppers and mozzarella', price: '₹1,449', category: 'Pizzas', image: 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=640&q=85&ixid=chicken-tikka-pizza' },
    { name: 'Pesto chicken pizza', description: 'Basil pesto, chicken, cherry tomatoes and mozzarella', price: '₹1,499', category: 'Pizzas', image: 'https://images.unsplash.com/photo-1593560708920-61dd98c8c8b2?auto=format&fit=crop&w=640&q=85' },
    { name: 'Caramelized onion pizza', description: 'Sweet onion, goat cheese, herbs and balsamic', price: '₹1,399', category: 'Pizzas', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=640&q=85&ixid=onion-pizza' },
    { name: 'Spicy sausage pizza', description: 'Spiced sausage, chilli, tomato and mozzarella', price: '₹1,549', category: 'Pizzas', image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=640&q=85&ixid=sausage-pizza' },
    { name: 'Watermelon cooler', description: 'Fresh watermelon, lime, mint and ice', price: '₹449', category: 'Drinks', image: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?auto=format&fit=crop&w=640&q=85' },
    { name: 'Peach iced tea', description: 'Black tea, peach, lemon and crushed ice', price: '₹449', category: 'Drinks', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=640&q=85' },
    { name: 'Rose milk', description: 'Chilled rose milk with basil seeds and ice cream', price: '₹499', category: 'Drinks', image: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=640&q=85' },
    { name: 'Pineapple ginger fizz', description: 'Pineapple, ginger, lime and sparkling water', price: '₹549', category: 'Drinks', image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=640&q=85&ixid=pineapple-fizz' },
    { name: 'Spiced corn ribs', description: 'Roasted corn ribs, lime, chilli and parmesan', price: '₹699', category: 'Snacks', image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=640&q=85' },
    { name: 'Salt and pepper mushrooms', description: 'Crisp mushrooms, pepper, spring onion and chilli', price: '₹799', category: 'Snacks', image: 'https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?auto=format&fit=crop&w=640&q=85' },
    { name: 'Chicken popcorn', description: 'Bite-sized fried chicken with ranch dip', price: '₹999', category: 'Snacks', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=640&q=85' },
    { name: 'Samosa platter', description: 'Crisp vegetable samosas with mint and tamarind chutney', price: '₹649', category: 'Snacks', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=640&q=85' },
    { name: 'Cajun potato skins', description: 'Baked potato skins, cheese, herbs and sour cream', price: '₹899', category: 'Snacks', image: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?auto=format&fit=crop&w=640&q=85&ixid=cajun-potato' },
    { name: 'Reshmi chicken kebab', description: 'Silky minced chicken, cream, herbs and mild spices', price: '₹1,399', category: 'Kebabs', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=640&q=85&ixid=reshmi-kebab' },
    { name: 'Malai broccoli kebab', description: 'Cream-marinated broccoli, cheese and cardamom', price: '₹1,099', category: 'Kebabs', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=640&q=85' },
    { name: 'Achari fish kebab', description: 'Fish fillet, pickling spices, onion and lemon', price: '₹1,599', category: 'Kebabs', image: 'https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?auto=format&fit=crop&w=640&q=85' },
    { name: 'Garlic lamb chops', description: 'Grilled lamb chops, garlic jus and rosemary', price: '₹1,999', category: 'Meat mains', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=640&q=85' },
    { name: 'Chicken tikka masala', description: 'Charred chicken in a rich tomato spice sauce', price: '₹1,549', category: 'Meat mains', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=640&q=85&ixid=chicken-tikka-masala' },
    { name: 'Mutton biryani', description: 'Fragrant basmati, tender mutton, saffron and fried onion', price: '₹1,799', category: 'Meat mains', image: 'https://loremflickr.com/640/480/mutton,biryani,rice?lock=202' },
    { name: 'Grilled chicken steak', description: 'Chicken breast, pepper sauce and seasonal greens', price: '₹1,699', category: 'Meat mains', image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=640&q=85&ixid=grilled-chicken-steak' },
    { name: 'Seafood chowder', description: 'Fish, prawns, vegetables and creamy herb broth', price: '₹1,099', category: 'Soups', image: 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?auto=format&fit=crop&w=640&q=85&ixid=seafood-chowder' },
    { name: 'Lentil dal soup', description: 'Red lentils, cumin, tomato and coriander', price: '₹649', category: 'Soups', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=640&q=85' },
    { name: 'French onion soup', description: 'Caramelized onion broth, herbs and melted cheese', price: '₹849', category: 'Soups', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=640&q=85' },
    { name: 'Pumpkin coconut soup', description: 'Roasted pumpkin, coconut milk, ginger and lime', price: '₹749', category: 'Soups', image: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&w=640&q=85' },
    { name: 'Paneer tikka masala', description: 'Tandoori paneer in a creamy tomato gravy', price: '₹1,399', category: 'Vegetarian mains', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=640&q=85' },
    { name: 'Thai green curry', description: 'Vegetables, tofu, coconut curry and jasmine rice', price: '₹1,299', category: 'Vegetarian mains', image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=640&q=85' },
    { name: 'Chana masala', description: 'Slow-cooked chickpeas, tomato, ginger and spices', price: '₹999', category: 'Vegetarian mains', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=640&q=85' },
    { name: 'Vegetable korma', description: 'Seasonal vegetables in a cashew coconut sauce', price: '₹1,199', category: 'Vegetarian mains', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=640&q=85' },
    { name: 'Baingan bharta', description: 'Smoked eggplant, tomato, onion and coriander', price: '₹1,049', category: 'Vegetarian mains', image: 'https://loremflickr.com/640/480/eggplant,curry,indian?lock=201' },
    { name: 'Tiramisu', description: 'Espresso-soaked sponge, mascarpone and cocoa', price: '₹999', category: 'Desserts', image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=640&q=85' },
    { name: 'Mango kulfi', description: 'Traditional mango ice cream with pistachio', price: '₹649', category: 'Desserts', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=640&q=85' },
    { name: 'Jalebi', description: 'Crisp saffron spirals soaked in fragrant sugar syrup', price: '₹649', category: 'Desserts', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=640&q=85&ixid=jalebi' },
    { name: 'Caramel custard', description: 'Silky baked custard with golden caramel', price: '₹699', category: 'Desserts', image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=640&q=85' },
    { name: 'Mango kulfi', description: 'Traditional mango ice cream with pistachio', price: '₹649', category: 'Desserts', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=640&q=85' },
    { name: 'Rasmalai', description: 'Soft cheese dumplings in saffron cardamom milk', price: '₹749', category: 'Desserts', image: 'https://images.unsplash.com/photo-1606471191009-63994c53433b?auto=format&fit=crop&w=640&q=85' },
  ].map((item, index) => ({ ...item, id: `menu-${index + 1}` })));
  protected readonly menuCategories = computed(() => Array.from(new Set(this.menuItems().map((item) => item.category))));
  protected readonly orders = signal<OrderRecord[]>([
    { id: '#1048', customer: 'Maya Thompson', table: 'Table 12', items: '3 items', total: '₹5,699', status: 'Preparing', time: '12 min ago' },
    { id: '#1047', customer: 'James Wilson', table: 'Takeaway', items: '2 items', total: '₹3,499', status: 'Ready', time: '18 min ago' },
    { id: '#1046', customer: 'Priya Shah', table: 'Table 04', items: '5 items', total: '₹9,999', status: 'Completed', time: '31 min ago' },
  ]);

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.activeView.set(this.labelForRoute(event.urlAfterRedirects));
    });
    if (this.isAuthenticated()) {
      this.api.currentUser().subscribe({
        next: (user) => {
          this.currentUser.set(user);
          this.loadWorkspaceData();
          if (this.activeView() === 'Settings') this.loadSettings();
          if (this.activeView() === 'Admin controls' && user.role === 'admin') this.loadUsers();
        },
        error: () => {
          sessionStorage.removeItem('rms_authenticated');
          this.isAuthenticated.set(false);
        },
      });
    }
  }

  private labelForRoute(url: string): string {
    const route = url.split('/')[1];
    return ({ dashboard: 'Dashboard', residents: 'Residents', units: 'Units & occupancy', billing: 'Leases & billing', maintenance: 'Maintenance', reports: 'Reports', 'order-menu': 'Order menu', 'order-details': 'Order details', 'customer-details': 'Customer details', settings: 'Settings', 'admin-controls': 'Admin controls' } as Record<string, string>)[route] ?? 'Dashboard';
  }

  protected filteredResidents() { const query = this.residentSearch().toLowerCase().trim(); return this.residents().filter((resident) => !query || `${resident.name} ${resident.unit} ${resident.property}`.toLowerCase().includes(query)); }
  protected filteredMenuItems() { const category = this.menuCategory(); return this.menuItems().filter((item) => item.category === category); }
  protected setMenuCategory(category: string): void { this.menuCategory.set(category); }
  protected primaryCustomer(): CustomerRecord | undefined { return this.customers()[0]; }
  protected customerOrders(): OrderRecord[] {
    const customer = this.primaryCustomer()?.name;
    return this.orders().filter((order) => order.customer === customer);
  }
  protected addMenuItem(item: MenuRecord): void {
    this.cartItems.update((items) => [...items, item]);
    this.workspaceError.set('');
    this.successMessage.set(`${item.name} added to the order.`);
  }
  protected createOrder(): void {
    const items = this.cartItems();
    if (items.length === 0) {
      this.workspaceError.set('Add at least one menu item before creating an order.');
      return;
    }
    const total = items.reduce((sum, item) => sum + Number(item.price.replace(/[^\d]/g, '')), 0);
    this.api.create<OrderRecord>('orders', {
      customer: this.currentUser()?.name ?? 'Guest',
      table: 'Takeaway',
      items: `${items.length} item${items.length === 1 ? '' : 's'}`,
      total: `₹${total.toLocaleString('en-IN')}`,
      status: 'Received',
      time: 'Just now',
    }).subscribe({
      next: (created) => {
        this.orders.update((records) => [created, ...records]);
        this.cartItems.set([]);
        this.showSuccess('Order created and added to the order board.');
      },
      error: (error: { error?: { error?: string } }) => this.workspaceError.set(error.error?.error ?? 'Could not create the order.'),
    });
  }
  protected advanceOrder(order: OrderRecord): void {
    const nextStatus = ({ Received: 'Preparing', Preparing: 'Ready', Ready: 'Completed', Completed: 'Completed', Cancelled: 'Cancelled' } as Record<string, string>)[order.status];
    this.api.update<OrderRecord>('orders', order.id, { status: nextStatus }).subscribe({
      next: (updated) => this.orders.update((records) => records.map((entry) => entry.id === order.id ? updated : entry)),
      error: (error: { error?: { error?: string } }) => this.workspaceError.set(error.error?.error ?? 'Could not advance this order.'),
    });
  }
  protected advanceFirstOrder(): void {
    const order = this.orders().find((entry) => !['Completed', 'Cancelled'].includes(entry.status));
    if (order) this.advanceOrder(order);
    else this.workspaceError.set('There are no active orders to update.');
  }
  protected openMaintenanceRequest(): void {
    this.maintenanceForm.reset({ title: '', unit: '', priority: 'Normal', assignee: 'Unassigned' });
    this.showMaintenanceModal.set(true);
  }
  protected saveMaintenanceRequest(): void {
    if (this.maintenanceForm.invalid) {
      this.maintenanceForm.markAllAsTouched();
      return;
    }
    this.api.create<MaintenanceRecord>('maintenance', {
      ...this.maintenanceForm.getRawValue(),
      status: 'New',
      age: 'Just now',
    }).subscribe({
      next: (ticket) => {
        this.maintenanceTickets.update((tickets) => [ticket, ...tickets]);
        this.showMaintenanceModal.set(false);
        this.showSuccess('Maintenance request created.');
      },
      error: (error: { error?: { error?: string } }) => this.workspaceError.set(error.error?.error ?? 'Could not create the maintenance request.'),
    });
  }
  protected openInvoice(): void {
    this.invoiceForm.reset({ label: '', detail: '', amount: '', status: '0% collected' });
    this.showInvoiceModal.set(true);
  }
  protected saveInvoice(): void {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      return;
    }
    this.api.create<InvoiceRecord>('invoices', this.invoiceForm.getRawValue()).subscribe({
      next: (invoice) => {
        this.invoices.update((records) => [invoice, ...records]);
        this.showInvoiceModal.set(false);
        this.showSuccess('Invoice added to the billing cycles.');
      },
      error: (error: { error?: { error?: string } }) => this.workspaceError.set(error.error?.error ?? 'Could not create the invoice.'),
    });
  }
  protected openCustomer(customer?: CustomerRecord): void {
    this.selectedCustomerId.set(customer?.id ?? '');
    this.customerForm.reset(customer
      ? { name: customer.name, email: customer.email, phone: customer.phone }
      : { name: '', email: '', phone: '' });
    this.showCustomerModal.set(true);
  }
  protected saveCustomer(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }
    const values = this.customerForm.getRawValue();
    const id = this.selectedCustomerId();
    const existing = this.customers().find((customer) => customer.id === id);
    const request = existing
      ? this.api.update<CustomerRecord>('customers', existing.id, values)
      : this.api.create<CustomerRecord>('customers', {
        ...values, visits: 0, lifetimeSpend: '₹0', favoriteTable: '—', favoriteItem: '—',
      });
    request.subscribe({
      next: (customer) => {
        this.customers.update((customers) => existing
          ? customers.map((entry) => entry.id === customer.id ? customer : entry)
          : [...customers, customer]);
        this.showCustomerModal.set(false);
        this.showSuccess(existing ? 'Customer details saved.' : 'Customer profile created.');
      },
      error: (error: { error?: { error?: string } }) => this.workspaceError.set(error.error?.error ?? 'Could not save the customer profile.'),
    });
  }
  protected exportInvoices(): void {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = [
      ['Invoice', 'Details', 'Amount', 'Status'],
      ...this.invoices().map(({ label, detail, amount, status }) => [label, detail, amount, status]),
    ];
    const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'invoices.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    this.showSuccess('Invoice list exported.');
  }
  protected userInitials(): string { return this.initialsFor(this.currentUser()?.name ?? 'Staff'); }
  protected initialsFor(name: string): string { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join(''); }
  protected signIn(user: AuthUser): void {
    sessionStorage.setItem('rms_authenticated', 'true');
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    this.workspaceError.set('');
    this.loadWorkspaceData();
    void this.router.navigate(['/dashboard']);
  }
  protected signOut(): void {
    this.api.logout().subscribe({
      next: () => this.finishSignOut(),
      error: (error: { status?: number }) => {
        if (error.status === 401) {
          this.finishSignOut();
          return;
        }
        this.workspaceError.set('Could not sign out because the server is unavailable. Please try again.');
      },
    });
  }
  protected setView(view: string): void {
    this.activeView.set(view);
    const route = { Dashboard: 'dashboard', Residents: 'residents', 'Units & occupancy': 'units', 'Leases & billing': 'billing', Maintenance: 'maintenance', Reports: 'reports', 'Order menu': 'order-menu', 'Order details': 'order-details', 'Customer details': 'customer-details', Settings: 'settings', 'Admin controls': 'admin-controls' }[view as 'Dashboard' | 'Residents' | 'Units & occupancy' | 'Leases & billing' | 'Maintenance' | 'Reports' | 'Order menu' | 'Order details' | 'Customer details' | 'Settings' | 'Admin controls'];
    if (route) void this.router.navigate([route]);
    this.workspaceError.set('');
    this.successMessage.set('');
    if (view === 'Settings') this.loadSettings();
    if (view === 'Admin controls' && this.currentUser()?.role === 'admin') this.loadUsers();
  }
  protected openResident(residentName?: string): void {
    const resident = this.residents().find((entry) => entry.name === residentName);
    this.selectedResident.set(residentName ?? '');
    this.residentForm.reset(resident ? { fullName: resident.name, unit: resident.unit, email: resident.email } : { fullName: '', unit: '', email: '' });
    this.showResidentModal.set(true);
  }
  protected closeResident(): void { this.showResidentModal.set(false); }
  protected toggleMood(): void {
    const darkMode = !this.darkMode();
    this.darkMode.set(darkMode);
    this.settingsForm.controls.darkMode.setValue(darkMode);
    if (this.currentUser()?.role !== 'staff') {
      this.api.settings().pipe(switchMap((settings) => this.api.saveSettings({ ...settings, darkMode }))).subscribe({
        error: (error: { error?: { error?: string } }) => this.workspaceError.set(error.error?.error ?? 'Could not save your appearance preference.'),
      });
    }
  }
  protected saveResident(): void {
    if (this.residentForm.invalid) { this.residentForm.markAllAsTouched(); return; }
    const { fullName, unit, email } = this.residentForm.getRawValue();
    const existing = this.residents().find((resident) => resident.name === this.selectedResident());
    const initials = this.initialsFor(fullName);
    const request = existing
      ? this.api.update<ResidentRecord>('residents', existing.id, { name: fullName, unit, email, initials })
      : this.api.create<ResidentRecord>('residents', {
        name: fullName, unit, email, property: 'Parkview Heights', lease: 'Active',
        payment: 'Pending', move: new Date().toLocaleDateString('en-IN'), initials, tone: 'teal', balance: '₹0.00',
      });
    request.subscribe({
      next: (resident) => {
        this.residents.update((records) => existing ? records.map((entry) => entry.id === resident.id ? resident : entry) : [...records, resident]);
        this.successMessage.set(existing ? 'Resident details saved.' : 'Resident added to the directory.');
        this.closeResident();
        this.residentForm.reset();
      },
      error: (error: { error?: { error?: string } }) => this.workspaceError.set(error.error?.error ?? 'Could not save this resident. Please try again.'),
    });
  }
  protected markTicket(ticketId: string): void {
    const ticket = this.maintenanceTickets().find((entry) => entry.id === ticketId);
    if (!ticket) return;
    const nextStatus = ({ New: 'Assigned', Assigned: 'In progress', 'In progress': 'Resolved', Resolved: 'Resolved' } as Record<string, string>)[ticket.status];
    this.api.update<MaintenanceRecord>('maintenance', ticketId, { status: nextStatus }).subscribe({
      next: (updated) => this.maintenanceTickets.update((tickets) => tickets.map((entry) => entry.id === ticketId ? updated : entry)),
      error: (error: { error?: { error?: string } }) => this.workspaceError.set(error.error?.error ?? 'Could not update the maintenance request.'),
    });
  }

  protected saveSettings(silent = false): void {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }
    this.isSavingSettings.set(true);
    const values = this.settingsForm.getRawValue();
    const settings: WorkspaceSettings = { ...values, currency: values.currency as WorkspaceSettings['currency'] };
    this.api.saveSettings(settings).subscribe({
      next: (saved) => {
        this.isSavingSettings.set(false);
        this.darkMode.set(saved.darkMode);
        if (!silent) this.showSuccess('Workspace settings saved.');
      },
      error: (error: { error?: { error?: string } }) => {
        this.isSavingSettings.set(false);
        this.workspaceError.set(error.error?.error ?? 'Could not save settings. Please try again.');
      },
    });
  }

  protected createUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    this.isCreatingUser.set(true);
    const values = this.userForm.getRawValue();
    const role = values.role as UserRole;
    this.api.addUser({ name: values.name, email: values.email, password: values.password, role }).subscribe({
      next: (user) => {
        this.adminUsers.update((users) => [...users, user]);
        this.userForm.reset({ name: '', email: '', password: '', role: 'manager' });
        this.isCreatingUser.set(false);
        this.showSuccess('Team member account created.');
      },
      error: (error: { error?: { error?: string } }) => {
        this.isCreatingUser.set(false);
        this.workspaceError.set(error.error?.error ?? 'Could not create the account. Please try again.');
      },
    });
  }

  protected changeUserRole(userId: string, event: Event): void {
    const role = (event.target as HTMLSelectElement).value as UserRole;
    this.api.updateUser(userId, { role }).subscribe({
      next: (updated) => {
        this.adminUsers.update((users) => users.map((user) => user.id === userId ? { ...user, role: updated.role } : user));
        this.showSuccess('Team member role updated.');
      },
      error: (error: { error?: { error?: string } }) => this.workspaceError.set(error.error?.error ?? 'Could not update the account role.'),
    });
  }

  protected toggleUser(user: AdminUser): void {
    this.api.updateUser(user.id, { active: !user.active }).subscribe({
      next: (updated) => {
        this.adminUsers.update((users) => users.map((entry) => entry.id === user.id ? { ...entry, active: updated.active } : entry));
        this.showSuccess(updated.active ? 'Account enabled.' : 'Account disabled and its sessions revoked.');
      },
      error: (error: { error?: { error?: string } }) => this.workspaceError.set(error.error?.error ?? 'Could not change account access.'),
    });
  }

  private finishSignOut(): void {
    sessionStorage.removeItem('rms_authenticated');
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.showResidentModal.set(false);
    this.showMaintenanceModal.set(false);
    this.showInvoiceModal.set(false);
    this.showCustomerModal.set(false);
    void this.router.navigate(['/login']);
  }

  private loadWorkspaceData(): void {
    forkJoin({
      residents: this.api.list<ResidentRecord>('residents'),
      units: this.api.list<{ label: string; value: number; total: number; tone: string }>('units'),
      invoices: this.api.list<{ label: string; detail: string; amount: string; status: string }>('invoices'),
      maintenance: this.api.list<MaintenanceRecord>('maintenance'),
      menu: this.api.list<MenuRecord>('menu'),
      orders: this.api.list<OrderRecord>('orders'),
      customers: this.api.list<CustomerRecord>('customers'),
    }).subscribe({
      next: (data) => {
        this.residents.set(data.residents);
        this.units.set(data.units);
        this.invoices.set(data.invoices);
        this.maintenanceTickets.set(data.maintenance);
        this.menuItems.set(data.menu);
        this.orders.set(data.orders);
        this.customers.set(data.customers);
      },
      error: (error: { error?: { error?: string } }) => {
        this.workspaceError.set(error.error?.error ?? 'Could not load workspace data from the server.');
        this.residents.set([]);
        this.units.set([]);
        this.invoices.set([]);
        this.maintenanceTickets.set([]);
        this.menuItems.set([]);
        this.orders.set([]);
        this.customers.set([]);
      },
    });
  }

  private loadSettings(): void {
    this.api.settings().subscribe({
      next: (settings) => {
        this.settingsForm.patchValue(settings);
        this.darkMode.set(settings.darkMode);
      },
      error: (error: { error?: { error?: string } }) => this.workspaceError.set(error.error?.error ?? 'Could not load workspace settings.'),
    });
  }

  private loadUsers(): void {
    forkJoin({ users: this.api.users(), audit: this.api.auditEvents() }).subscribe({
      next: ({ users, audit }) => {
        this.adminUsers.set(users);
        this.auditEvents.set(audit);
      },
      error: (error: { error?: { error?: string } }) => this.workspaceError.set(error.error?.error ?? 'Could not load workspace accounts.'),
    });
  }

  protected showSuccess(message: string): void {
    this.workspaceError.set('');
    this.successMessage.set(message);
    globalThis.setTimeout(() => this.successMessage.set(''), 3500);
  }
}

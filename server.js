const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const session = require('express-session');
const cookieParser = require('cookie-parser'); // Правильный импорт
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Настройка парсера куки
app.use(cookieParser());

// Настройка сессий
const sessionMiddleware = session({
  secret: 'your_secret_key', // Замените на свой секретный ключ
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 600000 } // Время жизни сессии: 10 минут
});

app.use(sessionMiddleware);

// Задаём пароль для доступа
const SECRET_PASSWORD = '12345';

// Первая таблица: пользователи
let userList = [];

// Вторая таблица: информация о кораблях (Needed и текущий подсчёт)
const SHIP_OPTIONS = ['Destroyer', 'Cruiser', 'Battleship', 'Carrier'];
let shipsData = {};

// Инициализация shipsData
function initShipsData() {
  shipsData = {};
  SHIP_OPTIONS.forEach(ship => {
    shipsData[ship] = {
      needed: 0,
      amount: 0,
    };
  });
}
initShipsData();

// Подсчёт текущих значений для shipsData.amount
function recalcShipAmounts() {
  // Обнуляем перед новым расчётом
  for (const ship of SHIP_OPTIONS) {
    shipsData[ship].amount = 0;
  }

  // Перебираем всех пользователей и считаем, сколько каких кораблей выбрано
  userList.forEach(user => {
    user.ships.forEach(ship => {
      if (ship && shipsData[ship]) shipsData[ship].amount++;
    });
  });
}

// Middleware для защиты маршрутов
function authMiddleware(req, res, next) {
  if (req.session && req.session.authenticated) {
    next();
  } else {
    res.redirect('/');
  }
}

// Маршруты

// Главная страница входа
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка проверки пароля
app.post('/login', express.urlencoded({ extended: true }), (req, res) => {
  const { password } = req.body;
  if (password === SECRET_PASSWORD) {
    req.session.authenticated = true;
    res.redirect('/main');
  } else {
    res.redirect('/?error=Неправильный пароль');
  }
});

// Защищённая основная страница
app.get('/main', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

// Подключение статических файлов
app.use('/public', express.static(path.join(__dirname, 'public')));

// Интеграция сессий с Socket.IO
io.use((socket, next) => {
  const req = socket.request;
  const res = req.res || {};

  sessionMiddleware(req, res, next);
});

io.on('connection', (socket) => {
  const req = socket.request;
  if (!req.session || !req.session.authenticated) {
    console.log('Попытка подключения без аутентификации:', socket.id);
    socket.disconnect(true);
    return;
  }

  console.log('Пользователь подключился:', socket.id);

  // При новом подключении отправляем данные
  socket.emit('initialData', {
    userList,
    shipsData
  });

  // Обработка события нового пользователя
  socket.on('newUser', (userName) => {
    console.log(`Новый пользователь: ${userName}`);
    const newEntry = {
      name: userName,
      ships: []
    };
    userList.push(newEntry);
    recalcShipAmounts();
    io.emit('updateTable', userList);
    io.emit('updateShipsData', shipsData);
  });

  // Обработка события обновления корабля
  socket.on('updateShip', (data) => {
    console.log(`Обновление корабля: ${JSON.stringify(data)}`);
    const user = userList.find(u => u.name === data.name);
    if (user && data.shipValue) {
      user.ships.push(data.shipValue);
      recalcShipAmounts();
      io.emit('updateTable', userList);
      io.emit('updateShipsData', shipsData);
    }
  });

  // Обработка события обновления "Needed"
  socket.on('updateNeeded', (data) => {
    console.log(`Обновление Needed: ${JSON.stringify(data)}`);
    const { ship, neededValue } = data;
    if (shipsData[ship]) {
      shipsData[ship].needed = Number(neededValue);
      io.emit('updateShipsData', shipsData);
    }
  });

  // Обработка сброса Таблицы 1
  socket.on('resetTable1', () => {
    console.log('Сброс Таблицы 1');
    userList = [];
    recalcShipAmounts();
    io.emit('updateTable', userList);
    io.emit('updateShipsData', shipsData);
  });

  // Обработка сброса Таблицы 2
  socket.on('resetTable2', () => {
    console.log('Сброс Таблицы 2');
    initShipsData();
    recalcShipAmounts();
    io.emit('updateShipsData', shipsData);
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключился:', socket.id);
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

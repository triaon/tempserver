const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Парсер куки
app.use(cookieParser());

// Сессии
const sessionMiddleware = session({
  secret: 'your_secret_key', // Замените на свой секретный ключ
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 600000 } // 10 минут
});
app.use(sessionMiddleware);

// Пароль для доступа
const SECRET_PASSWORD = '12345';

// Первая таблица: пользователи
let userList = [];

/*
  Важно! Добавьте сюда все корабли, которые нужны.
  Например: Nestor, Painter, Vindicator, Bonus (Armor),
           Cap Truck, HD, Leshak, Bonus (Info),
           DPS, DPS (BC), Widow, Bonus (Skirm).
*/
const SHIP_OPTIONS = [
  'Nestor', 'Painter', 'Vindicator', 'Bonus (Armor)',
  'Cap Truck', 'HD', 'Leshak', 'Bonus (Info)',
  'DPS', 'DPS (BC)', 'Widow', 'Bonus (Skirm)'
];

// Вторая таблица: информация о кораблях
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

// Подсчёт текущих значений shipsData.amount
function recalcShipAmounts() {
  // Обнуляем
  for (const ship in shipsData) {
    shipsData[ship].amount = 0;
  }
  // Перебираем всех пользователей
  userList.forEach(user => {
    user.ships.forEach(ship => {
      if (ship && shipsData[ship]) {
        shipsData[ship].amount++;
      }
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
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/login', express.urlencoded({ extended: true }), (req, res) => {
  const { password } = req.body;
  if (password === SECRET_PASSWORD) {
    req.session.authenticated = true;
    res.redirect('/main');
  } else {
    res.redirect('/?error=Неправильный пароль');
  }
});

app.get('/main', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

// Статические файлы
app.use('/public', express.static(path.join(__dirname, 'public')));

// Интеграция сессий с Socket.IO
io.use((socket, next) => {
  const req = socket.request;
  const res = req.res || {};
  sessionMiddleware(req, res, next);
});

// Socket.IO
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

  // Новый пользователь
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

  // Обновление корабля (добавление)
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

  // Удаление корабля
  socket.on('removeShip', (data) => {
    console.log(`Удаление корабля: ${JSON.stringify(data)}`);
    const user = userList.find(u => u.name === data.name);
    if (user) {
      user.ships = user.ships.filter(ship => ship !== data.shipValue);
      recalcShipAmounts();
      io.emit('updateTable', userList);
      io.emit('updateShipsData', shipsData);
    }
  });

  // Обновление Needed
  socket.on('updateNeeded', (data) => {
    console.log(`Обновление Needed: ${JSON.stringify(data)}`);
    const { ship, neededValue } = data;
    if (shipsData[ship]) {
      shipsData[ship].needed = Number(neededValue);
      io.emit('updateShipsData', shipsData);
    }
  });

  // Сброс Таблицы 1
  socket.on('resetTable1', () => {
    console.log('Сброс Таблицы 1');
    userList = [];
    recalcShipAmounts();
    io.emit('updateTable', userList);
    io.emit('updateShipsData', shipsData);
  });

  // Сброс Таблицы 2
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

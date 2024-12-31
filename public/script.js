// Проверяем, что мы на странице main
if (window.location.pathname.includes('main')) {
  // Элементы DOM
  const nameInput = document.getElementById('nameInput');
  const nameBtn = document.getElementById('nameBtn');
  const userTableBody = document.getElementById('userTableBody');
  const resetTable1Btn = document.getElementById('resetTable1Btn');
  const resetTable2Btn = document.getElementById('resetTable2Btn');
  
  // Новый контейнер для "Таблицы 2" в зонах
  const statsContainer = document.getElementById('statsContainer');

  // Подключаемся к сокету
  const socket = io();

  // Проверка подключения
  socket.on('connect', () => {
    console.log('Успешно подключено к серверу через Socket.IO');
  });

  socket.on('connect_error', (error) => {
    console.error('Ошибка подключения к Socket.IO:', error);
  });

  // При нажатии "Отправить" — добавить пользователя
  nameBtn.addEventListener('click', () => {
    const userName = nameInput.value.trim();
    if (userName) {
      console.log(`Отправка нового пользователя: ${userName}`);
      socket.emit('newUser', userName);
      nameInput.value = '';
    }
  });

  // Обработчики сброса таблиц
  resetTable1Btn.addEventListener('click', () => {
    if (confirm('Вы уверены, что хотите сбросить Таблицу 1?')) {
      console.log('Отправка сброса Таблицы 1');
      socket.emit('resetTable1');
    }
  });

  resetTable2Btn.addEventListener('click', () => {
    if (confirm('Вы уверены, что хотите сбросить Таблицу 2?')) {
      console.log('Отправка сброса Таблицы 2');
      socket.emit('resetTable2');
    }
  });

  // При первом подключении получаем все данные
  socket.on('initialData', (data) => {
    console.log('Получены начальные данные:', data);
    renderUserTable(data.userList);
    renderStatsZoned(data.shipsData);
  });

  // При обновлении Таблицы 1 (Пользователи)
  socket.on('updateTable', (userList) => {
    console.log('Обновление Таблицы 1:', userList);
    renderUserTable(userList);
  });

  // При обновлении данных о кораблях (Таблица 2)
  socket.on('updateShipsData', (shipsData) => {
    console.log('Обновление Таблицы 2:', shipsData);
    renderStatsZoned(shipsData);
  });

  // Функция отрисовки Таблицы 1 (Пользователи)
  function renderUserTable(userList) {
    userTableBody.innerHTML = '';

    userList.forEach((user) => {
      const row = document.createElement('tr');

      // 1) Имя
      const nameCell = document.createElement('td');
      nameCell.textContent = user.name;
      row.appendChild(nameCell);

      // 2) Корабли
      const shipsCell = document.createElement('td');
      shipsCell.innerHTML = '';
      shipsCell.style.display = 'flex';
      shipsCell.style.flexWrap = 'wrap';
      shipsCell.style.gap = '8px';

      // Для каждого корабля у пользователя — див с крестиком
      user.ships.forEach((ship) => {
        const shipWrapper = document.createElement('span');
        shipWrapper.classList.add('ship-wrapper');

        const shipSpan = document.createElement('span');
        shipSpan.textContent = ship;
        shipSpan.classList.add('ship-name');

        const removeButton = document.createElement('button');
        removeButton.innerHTML = '&times;';
        removeButton.classList.add('remove-ship-btn');
        removeButton.title = 'Удалить корабль';

        removeButton.addEventListener('click', () => {
          socket.emit('removeShip', {
            name: user.name,
            shipValue: ship
          });
        });

        shipWrapper.appendChild(shipSpan);
        shipWrapper.appendChild(removeButton);
        shipsCell.appendChild(shipWrapper);
      });
      row.appendChild(shipsCell);

      // 3) Добавление нового корабля (селектор)
      const selectCell = document.createElement('td');
      const select = document.createElement('select');

      const shipOptions = [
        '',
        // Пример: можно расширять/изменять
        'Nestor', 'Painter', 'Vindicator', 'Bonus (Armor)',
        'Cap Truck', 'HD', 'Leshak', 'Bonus (Info)',
        'DPS', 'DPS (BC)', 'Widow', 'Bonus (Skirm)',
      ];
      shipOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt || 'Не выбрано';
        select.appendChild(option);
      });

      select.addEventListener('change', () => {
        const selectedValue = select.value;
        if (selectedValue) {
          socket.emit('updateShip', {
            name: user.name,
            shipValue: selectedValue
          });
          select.value = '';
        }
      });

      selectCell.appendChild(select);
      row.appendChild(selectCell);

      userTableBody.appendChild(row);
    });
  }

  // Новая функция для «зонной» Таблицы 2
  function renderStatsZoned(shipsData) {
    // Очищаем контейнер
    statsContainer.innerHTML = '';

    // Определяем зоны и соответствующие корабли
    const zones = [
      {
        name: 'pink-zone',
        ships: ['Nestor', 'Painter', 'Vindicator', 'Bonus (Armor)'],
      },
      {
        name: 'yellow-zone',
        ships: ['Cap Truck', 'HD', 'Leshak', 'Bonus (Info)'],
      },
      {
        name: 'green-zone',
        ships: ['DPS', 'DPS (BC)', 'Widow', 'Bonus (Skirm)'],
      },
    ];

    zones.forEach((zone) => {
      // Обёртка для зоны
      const zoneWrapper = document.createElement('div');
      zoneWrapper.classList.add('zone-wrapper', zone.name);

      // "Шапка"
      const headerRow = document.createElement('div');
      headerRow.classList.add('zone-row', 'zone-header');

      const headers = ['Ship', 'Amount', 'Need'];
      headers.forEach((hdr) => {
        const cell = document.createElement('div');
        cell.classList.add('zone-cell', 'zone-header-cell');
        cell.textContent = hdr;
        headerRow.appendChild(cell);
      });
      zoneWrapper.appendChild(headerRow);

      // Строки по каждому кораблю
      zone.ships.forEach((shipName) => {
        if (shipsData[shipName]) {
          const row = document.createElement('div');
          row.classList.add('zone-row');

          // 1) Ship
          const shipCell = document.createElement('div');
          shipCell.classList.add('zone-cell');
          shipCell.textContent = shipName;
          row.appendChild(shipCell);

          // 2) Amount
          const amountCell = document.createElement('div');
          amountCell.classList.add('zone-cell');
          amountCell.textContent = shipsData[shipName].amount || 0;
          row.appendChild(amountCell);

          // 3) Need (редактируемое поле)
          const needCell = document.createElement('div');
          needCell.classList.add('zone-cell');

          const needInput = document.createElement('input');
          needInput.type = 'number';
          needInput.value = shipsData[shipName].needed || 0;
          needInput.classList.add('need-input');

          needInput.addEventListener('change', () => {
            const newValue = parseInt(needInput.value, 10);
            // Отправляем событие обновления "Needed"
            socket.emit('updateNeeded', {
              ship: shipName,
              neededValue: newValue,
            });
          });

          needCell.appendChild(needInput);
          row.appendChild(needCell);

          zoneWrapper.appendChild(row);
        }
      });

      statsContainer.appendChild(zoneWrapper);
    });
  }
}

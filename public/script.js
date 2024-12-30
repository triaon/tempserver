if (window.location.pathname.includes('main')) {
    // Элементы DOM
    const nameInput = document.getElementById('nameInput');
    const nameBtn = document.getElementById('nameBtn');
    const userTableBody = document.getElementById('userTableBody');
    const resetTable1Btn = document.getElementById('resetTable1Btn');
    const statsTableBody = document.getElementById('statsTableBody');
    const resetTable2Btn = document.getElementById('resetTable2Btn');
  
    // Подключаемся к сокету
    const socket = io();
  
    // Проверка подключения
    socket.on('connect', () => {
      console.log('Успешно подключено к серверу через Socket.IO');
    });
  
    socket.on('connect_error', (error) => {
      console.error('Ошибка подключения к Socket.IO:', error);
    });
  
    // При нажатии "Отправить"
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
      renderStatsTable(data.shipsData);
    });
  
    // При обновлении Таблицы 1 (Пользователи)
    socket.on('updateTable', (userList) => {
      console.log('Обновление Таблицы 1:', userList);
      renderUserTable(userList);
    });
  
    // При обновлении Таблицы 2 (Корабли)
    socket.on('updateShipsData', (shipsData) => {
      console.log('Обновление Таблицы 2:', shipsData);
      renderStatsTable(shipsData);
    });
  
    // Функция отрисовки Таблицы 1
    function renderUserTable(userList) {
      console.log('Рендер Таблицы 1 с данными:', userList);
      userTableBody.innerHTML = '';
      userList.forEach((user) => {
        const row = document.createElement('tr');
  
        // Имя
        const nameCell = document.createElement('td');
        nameCell.textContent = user.name;
        row.appendChild(nameCell);
  
        // Корабли
        const shipsCell = document.createElement('td');
        shipsCell.textContent = user.ships.join(', ');
        row.appendChild(shipsCell);
  
        // Добавляем селектор для выбора корабля
        const selectCell = document.createElement('td');
        const select = document.createElement('select');
        const shipOptions = ['', 'Destroyer', 'Cruiser', 'Battleship', 'Carrier'];
  
        shipOptions.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt || 'Не выбрано';
          select.appendChild(option);
        });
  
        select.addEventListener('change', () => {
          const selectedValue = select.value;
          if (selectedValue) { // Проверяем, что выбрано не "Не выбрано"
            console.log(`Выбрано: ${selectedValue} для пользователя: ${user.name}`);
            socket.emit('updateShip', {
              name: user.name,
              shipValue: selectedValue
            });
            // Сброс селектора
            select.value = '';
          }
        });
  
        selectCell.appendChild(select);
        row.appendChild(selectCell);
  
        userTableBody.appendChild(row);
      });
    }
  
    // Функция отрисовки Таблицы 2
    function renderStatsTable(shipsData) {
      console.log('Рендер Таблицы 2 с данными:', shipsData);
      statsTableBody.innerHTML = '';
      // shipsData = { 'Destroyer': { needed, amount }, ... }
      for (const ship in shipsData) {
        const row = document.createElement('tr');
  
        // 1) Ship
        const shipCell = document.createElement('td');
        shipCell.textContent = ship;
        row.appendChild(shipCell);
  
        // 2) Needed
        const neededCell = document.createElement('td');
        const neededInput = document.createElement('input');
        neededInput.type = 'number';
        neededInput.min = '0';
        neededInput.value = shipsData[ship].needed;
        neededInput.addEventListener('change', () => {
          const newValue = neededInput.value;
          console.log(`Обновление Needed для ${ship}: ${newValue}`);
          socket.emit('updateNeeded', { ship, neededValue: newValue });
        });
        neededCell.appendChild(neededInput);
        row.appendChild(neededCell);
  
        // 3) Curr Amount
        const amountCell = document.createElement('td');
        amountCell.textContent = shipsData[ship].amount;
        row.appendChild(amountCell);
  
        statsTableBody.appendChild(row);
      }
    }
  }
  
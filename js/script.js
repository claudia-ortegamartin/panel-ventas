(function () {
  /* Desplegable propio. El popup de un <select> lo pinta el sistema operativo y
     no se puede estilar, asi que se sustituye por una lista normal para que siga
     el aspecto de la pagina. Mantiene lo que da el nativo: teclado, roles ARIA
     y cierre al pulsar fuera. */
  function createDropdown(root) {
    var toggle = root.querySelector(".dropdown-toggle");
    var label = root.querySelector(".dropdown-value");
    var list = root.querySelector(".dropdown-list");
    var options = [];
    var value = null;
    var listeners = [];
    var activeIndex = -1;

    function isOpen() {
      return !list.hidden;
    }

    function textFor(val) {
      for (var i = 0; i < options.length; i++) {
        if (options[i].value === val) return options[i].text;
      }
      return "";
    }

    function paint() {
      label.textContent = textFor(value);
      Array.prototype.forEach.call(list.children, function (item, index) {
        var selected = options[index].value === value;
        item.setAttribute("aria-selected", selected ? "true" : "false");
        item.classList.toggle("is-selected", selected);
        item.classList.toggle("is-active", index === activeIndex);
      });
    }

    function close() {
      if (!isOpen()) return;
      list.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      activeIndex = -1;
    }

    function open() {
      if (isOpen()) return;
      closeOthers(root);
      list.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      activeIndex = Math.max(0, options.findIndex(function (option) {
        return option.value === value;
      }));
      paint();
      scrollActiveIntoView();
    }

    function scrollActiveIntoView() {
      var item = list.children[activeIndex];
      if (item && item.scrollIntoView) item.scrollIntoView({ block: "nearest" });
    }

    function choose(index) {
      if (!options[index]) return;
      value = options[index].value;
      paint();
      close();
      toggle.focus();
      listeners.forEach(function (callback) { callback(value); });
    }

    function move(step) {
      if (!isOpen()) {
        open();
        return;
      }
      activeIndex = (activeIndex + step + options.length) % options.length;
      paint();
      scrollActiveIntoView();
    }

    toggle.addEventListener("click", function () {
      if (isOpen()) close(); else open();
    });

    toggle.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
      else if (event.key === "ArrowUp") { event.preventDefault(); move(-1); }
      else if (event.key === "Enter" || event.key === " ") {
        if (isOpen()) { event.preventDefault(); choose(activeIndex); }
      } else if (event.key === "Escape") { close(); }
      else if (event.key === "Home" && isOpen()) { event.preventDefault(); activeIndex = 0; paint(); scrollActiveIntoView(); }
      else if (event.key === "End" && isOpen()) { event.preventDefault(); activeIndex = options.length - 1; paint(); scrollActiveIntoView(); }
    });

    return {
      root: root,
      close: close,
      setOptions: function (nextOptions, keepValue) {
        options = nextOptions;
        list.innerHTML = "";
        options.forEach(function (option, index) {
          var item = document.createElement("li");
          item.className = "dropdown-option";
          item.setAttribute("role", "option");
          item.textContent = option.text;
          item.addEventListener("click", function () { choose(index); });
          item.addEventListener("mousemove", function () { activeIndex = index; paint(); });
          list.appendChild(item);
        });

        var stillThere = options.some(function (option) { return option.value === keepValue; });
        value = stillThere ? keepValue : (options[0] ? options[0].value : null);
        paint();
      },
      getValue: function () { return value; },
      setValue: function (next) { value = next; paint(); },
      onChange: function (callback) { listeners.push(callback); },
    };
  }

  var dropdowns = [];

  function closeOthers(except) {
    dropdowns.forEach(function (dropdown) {
      if (dropdown.root !== except) dropdown.close();
    });
  }

  document.addEventListener("click", function (event) {
    dropdowns.forEach(function (dropdown) {
      if (!dropdown.root.contains(event.target)) dropdown.close();
    });
  });

  var STORAGE_KEY = "panel-ventas:ventas";
  var ALL = "todos";
  var MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  var monthSelect = createDropdown(document.getElementById("month").closest("[data-dropdown]"));
  var categorySelect = createDropdown(document.getElementById("category").closest("[data-dropdown]"));
  var chart = document.getElementById("chart");
  var chartEmpty = document.getElementById("chart-empty");
  var tableBody = document.getElementById("table-body");
  var tooltip = document.getElementById("tooltip");

  var form = document.getElementById("sale-form");
  var formError = document.getElementById("form-error");
  var fMonth = createDropdown(document.getElementById("f-month").closest("[data-dropdown]"));
  var fCategory = document.getElementById("f-category");
  var fProduct = document.getElementById("f-product");
  var fUnits = document.getElementById("f-units");
  var fRevenue = document.getElementById("f-revenue");
  var suggestions = document.getElementById("category-suggestions");

  dropdowns.push(monthSelect, categorySelect, fMonth);

  var savedWrap = document.getElementById("saved-wrap");
  var savedList = document.getElementById("saved");
  var savedCount = document.getElementById("saved-count");
  var clearAll = document.getElementById("clear-all");

  // El almacenamiento del navegador puede fallar (ventana privada, permisos
  // bloqueados), asi que cada acceso va protegido y la pagina sigue funcionando.
  function loadSaved() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function persist(rows) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
      return true;
    } catch (error) {
      return false;
    }
  }

  var savedSales = loadSaved();

  function allSales() {
    return SALES.concat(savedSales);
  }

  function groupThousands(text) {
    return text.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function formatEuros(value) {
    return groupThousands(String(Math.round(value))) + " €";
  }

  function formatPrice(value) {
    var parts = value.toFixed(2).split(".");
    return groupThousands(parts[0]) + "," + parts[1] + " €";
  }

  function formatNumber(value) {
    return groupThousands(String(Math.round(value)));
  }

  function unique(rows, key) {
    var seen = [];
    rows.forEach(function (row) {
      if (seen.indexOf(row[key]) === -1) seen.push(row[key]);
    });
    return seen;
  }

  function sortedMonths(rows) {
    return unique(rows, "month").sort(function (a, b) {
      return MONTHS.indexOf(a) - MONTHS.indexOf(b);
    });
  }

  // Al refrescar los desplegables se conserva lo que hubiera elegido el usuario,
  // salvo que ese valor ya no exista en los datos.
  function refreshSelect(dropdown, values, allLabel) {
    var options = [{ value: ALL, text: allLabel }];
    values.forEach(function (value) {
      options.push({ value: value, text: value });
    });
    dropdown.setOptions(options, dropdown.getValue());
  }

  function refreshFormOptions() {
    fMonth.setOptions(
      MONTHS.map(function (month) { return { value: month, text: month }; }),
      fMonth.getValue() || MONTHS[0]
    );

    // Las categorias ya usadas van como botones y no como <datalist>, cuyo
    // desplegable tampoco se puede estilar.
    suggestions.innerHTML = "";
    unique(allSales(), "category").sort().forEach(function (category) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "suggestion";
      chip.textContent = category;
      chip.addEventListener("click", function () {
        fCategory.value = category;
        fCategory.focus();
      });
      suggestions.appendChild(chip);
    });
  }

  function getFilteredRows() {
    return allSales().filter(function (row) {
      var monthOk = monthSelect.getValue() === ALL || row.month === monthSelect.getValue();
      var categoryOk = categorySelect.getValue() === ALL || row.category === categorySelect.getValue();
      return monthOk && categoryOk;
    });
  }

  function sumBy(rows, key) {
    return rows.reduce(function (total, row) {
      return total + row[key];
    }, 0);
  }

  function groupBy(rows, key, extra) {
    var groups = {};
    rows.forEach(function (row) {
      if (!groups[row[key]]) {
        groups[row[key]] = { name: row[key], revenue: 0, units: 0, extra: row[extra] };
      }
      groups[row[key]].revenue += row.revenue;
      groups[row[key]].units += row.units;
    });
    return Object.keys(groups)
      .map(function (name) { return groups[name]; })
      .sort(function (a, b) { return b.revenue - a.revenue; });
  }

  function showTooltip(event, text) {
    tooltip.textContent = text;
    tooltip.hidden = false;
    var box = tooltip.getBoundingClientRect();
    var left = event.clientX + 14;
    if (left + box.width > window.innerWidth - 8) left = event.clientX - box.width - 14;
    tooltip.style.left = left + "px";
    tooltip.style.top = event.clientY - box.height - 10 + "px";
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  function renderChart(groups) {
    chart.innerHTML = "";
    chartEmpty.hidden = groups.length > 0;
    if (groups.length === 0) return;

    var max = groups[0].revenue;

    groups.forEach(function (group) {
      var row = document.createElement("div");
      row.className = "bar-row";

      var label = document.createElement("span");
      label.className = "bar-label";
      label.textContent = group.name;

      var track = document.createElement("div");
      track.className = "bar-track";

      var fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = max > 0 ? (group.revenue / max) * 100 + "%" : "0%";

      var value = document.createElement("span");
      value.className = "bar-value";
      value.textContent = formatEuros(group.revenue);

      track.appendChild(fill);
      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(value);

      var text = group.name + ": " + formatEuros(group.revenue) + " · " + formatNumber(group.units) + " unidades";
      row.addEventListener("mousemove", function (event) { showTooltip(event, text); });
      row.addEventListener("mouseleave", hideTooltip);

      chart.appendChild(row);
    });
  }

  function renderTable(products) {
    tableBody.innerHTML = "";
    products.slice(0, 5).forEach(function (product) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + product.name + "</td>" +
        "<td>" + product.extra + "</td>" +
        '<td class="num">' + formatNumber(product.units) + "</td>" +
        '<td class="num">' + formatEuros(product.revenue) + "</td>";
      tableBody.appendChild(tr);
    });
  }

  function renderSaved() {
    savedWrap.hidden = savedSales.length === 0;
    savedCount.textContent = savedSales.length;
    savedList.innerHTML = "";

    savedSales.forEach(function (sale, index) {
      var item = document.createElement("li");

      var main = document.createElement("div");
      main.className = "saved-main";
      main.innerHTML =
        "<div>" + sale.product + "</div>" +
        '<div class="saved-meta">' + sale.month + " · " + sale.category + "</div>";

      var figure = document.createElement("span");
      figure.className = "saved-figure";
      figure.textContent = formatNumber(sale.units) + " ud · " + formatEuros(sale.revenue);

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove";
      remove.textContent = "Quitar";
      remove.setAttribute("aria-label", "Quitar " + sale.product);
      remove.addEventListener("click", function () {
        savedSales.splice(index, 1);
        persist(savedSales);
        update();
      });

      item.appendChild(main);
      item.appendChild(figure);
      item.appendChild(remove);
      savedList.appendChild(item);
    });
  }

  function update() {
    refreshSelect(monthSelect, sortedMonths(allSales()), "Todos los meses");
    refreshSelect(categorySelect, unique(allSales(), "category").sort(), "Todas las categorías");
    refreshFormOptions();

    var rows = getFilteredRows();
    var revenue = sumBy(rows, "revenue");
    var units = sumBy(rows, "units");

    document.getElementById("kpi-revenue").textContent = formatEuros(revenue);
    document.getElementById("kpi-units").textContent = formatNumber(units);
    document.getElementById("kpi-average").textContent = units > 0 ? formatPrice(revenue / units) : "0,00 €";

    renderChart(groupBy(rows, "category", "category"));
    renderTable(groupBy(rows, "product", "category"));
    renderSaved();
    hideTooltip();
  }

  function showError(message) {
    formError.textContent = message;
    formError.hidden = false;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var category = fCategory.value.trim();
    var product = fProduct.value.trim();
    var units = parseInt(fUnits.value, 10);
    var revenue = parseFloat(fRevenue.value);

    if (!category || !product) {
      showError("Escribe la categoría y el producto.");
      return;
    }
    if (!(units > 0)) {
      showError("Las unidades tienen que ser un número mayor que cero.");
      return;
    }
    if (!(revenue >= 0)) {
      showError("Los ingresos tienen que ser un número positivo.");
      return;
    }

    savedSales.push({
      month: fMonth.getValue(),
      category: category,
      product: product,
      units: units,
      revenue: revenue,
    });

    if (!persist(savedSales)) {
      showError("No se ha podido guardar: el navegador tiene el almacenamiento bloqueado. La venta se ve igual, pero se perderá al recargar.");
    } else {
      formError.hidden = true;
    }

    fProduct.value = "";
    fUnits.value = "";
    fRevenue.value = "";
    update();
    fProduct.focus();
  });

  clearAll.addEventListener("click", function () {
    savedSales = [];
    persist(savedSales);
    formError.hidden = true;
    update();
  });

  monthSelect.onChange(update);
  categorySelect.onChange(update);

  update();
})();

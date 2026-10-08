(function () {
  var STORAGE_KEY = "panel-ventas:ventas";
  var ALL = "todos";
  var MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  var monthSelect = document.getElementById("month");
  var categorySelect = document.getElementById("category");
  var chart = document.getElementById("chart");
  var chartEmpty = document.getElementById("chart-empty");
  var tableBody = document.getElementById("table-body");
  var tooltip = document.getElementById("tooltip");

  var form = document.getElementById("sale-form");
  var formError = document.getElementById("form-error");
  var fMonth = document.getElementById("f-month");
  var fCategory = document.getElementById("f-category");
  var fProduct = document.getElementById("f-product");
  var fUnits = document.getElementById("f-units");
  var fRevenue = document.getElementById("f-revenue");
  var categories = document.getElementById("categories");

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
  function refreshSelect(select, values, allLabel) {
    var previous = select.value;
    select.innerHTML = "";

    var allOption = document.createElement("option");
    allOption.value = ALL;
    allOption.textContent = allLabel;
    select.appendChild(allOption);

    values.forEach(function (value) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });

    select.value = values.indexOf(previous) !== -1 ? previous : ALL;
  }

  function refreshFormOptions() {
    var used = unique(allSales(), "category").sort();

    fMonth.innerHTML = "";
    MONTHS.forEach(function (month) {
      var option = document.createElement("option");
      option.value = month;
      option.textContent = month;
      fMonth.appendChild(option);
    });

    categories.innerHTML = "";
    used.forEach(function (category) {
      var option = document.createElement("option");
      option.value = category;
      categories.appendChild(option);
    });
  }

  function getFilteredRows() {
    return allSales().filter(function (row) {
      var monthOk = monthSelect.value === ALL || row.month === monthSelect.value;
      var categoryOk = categorySelect.value === ALL || row.category === categorySelect.value;
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
      month: fMonth.value,
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

  monthSelect.addEventListener("change", update);
  categorySelect.addEventListener("change", update);

  update();
})();

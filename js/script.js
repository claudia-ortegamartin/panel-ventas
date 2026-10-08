(function () {
  var monthSelect = document.getElementById("month");
  var categorySelect = document.getElementById("category");
  var chart = document.getElementById("chart");
  var chartEmpty = document.getElementById("chart-empty");
  var tableBody = document.getElementById("table-body");
  var tooltip = document.getElementById("tooltip");

  var ALL = "todos";

  function unique(rows, key) {
    var seen = [];
    rows.forEach(function (row) {
      if (seen.indexOf(row[key]) === -1) seen.push(row[key]);
    });
    return seen;
  }

  // El espanol no pone separador de miles en cifras de cuatro digitos, pero en un
  // panel se comparan numeros de un vistazo y conviene que todos se agrupen igual.
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

  function fillSelect(select, values, allLabel) {
    var option = document.createElement("option");
    option.value = ALL;
    option.textContent = allLabel;
    select.appendChild(option);
    values.forEach(function (value) {
      var item = document.createElement("option");
      item.value = value;
      item.textContent = value;
      select.appendChild(item);
    });
  }

  function getFilteredRows() {
    return SALES.filter(function (row) {
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

  function groupByCategory(rows) {
    var groups = {};
    rows.forEach(function (row) {
      if (!groups[row.category]) {
        groups[row.category] = { category: row.category, revenue: 0, units: 0 };
      }
      groups[row.category].revenue += row.revenue;
      groups[row.category].units += row.units;
    });
    return Object.keys(groups)
      .map(function (key) { return groups[key]; })
      .sort(function (a, b) { return b.revenue - a.revenue; });
  }

  function groupByProduct(rows) {
    var groups = {};
    rows.forEach(function (row) {
      if (!groups[row.product]) {
        groups[row.product] = { product: row.product, category: row.category, revenue: 0, units: 0 };
      }
      groups[row.product].revenue += row.revenue;
      groups[row.product].units += row.units;
    });
    return Object.keys(groups)
      .map(function (key) { return groups[key]; })
      .sort(function (a, b) { return b.revenue - a.revenue; })
      .slice(0, 5);
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
      label.textContent = group.category;

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

      var text = group.category + ": " + formatEuros(group.revenue) + " · " + formatNumber(group.units) + " unidades";
      row.addEventListener("mousemove", function (event) { showTooltip(event, text); });
      row.addEventListener("mouseleave", hideTooltip);

      chart.appendChild(row);
    });
  }

  function renderTable(products) {
    tableBody.innerHTML = "";
    products.forEach(function (product) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + product.product + "</td>" +
        "<td>" + product.category + "</td>" +
        '<td class="num">' + formatNumber(product.units) + "</td>" +
        '<td class="num">' + formatEuros(product.revenue) + "</td>";
      tableBody.appendChild(tr);
    });
  }

  function update() {
    var rows = getFilteredRows();
    var revenue = sumBy(rows, "revenue");
    var units = sumBy(rows, "units");

    document.getElementById("kpi-revenue").textContent = formatEuros(revenue);
    document.getElementById("kpi-units").textContent = formatNumber(units);
    document.getElementById("kpi-average").textContent = units > 0 ? formatPrice(revenue / units) : "0,00 €";

    renderChart(groupByCategory(rows));
    renderTable(groupByProduct(rows));
    hideTooltip();
  }

  fillSelect(monthSelect, unique(SALES, "month"), "Todos los meses");
  fillSelect(categorySelect, unique(SALES, "category"), "Todas las categorías");

  monthSelect.addEventListener("change", update);
  categorySelect.addEventListener("change", update);

  update();
})();

# Panel de ventas

Panel de una tienda de ropa con datos de ejemplo del primer semestre: indicadores, ventas por categoría y productos más vendidos. Los filtros de mes y categoría recalculan todo al vuelo.

Es la parte práctica de lo que vi en el curso de Big Data y Business Intelligence, pero montado a mano con lo que sé de web, en vez de con Power BI.

## Uso

Abre `index.html` en el navegador. No necesita servidor ni instalación.

## Detalles técnicos

- HTML, CSS y JavaScript, sin librerías ni dependencias.
- El gráfico de barras está hecho con CSS, no con una librería de gráficos: cada barra es un `div` cuyo ancho es el porcentaje sobre el valor más alto.
- Una sola serie, un solo color. Pintar cada categoría de un color distinto sería color decorativo: la categoría ya está escrita en la etiqueta y el color no aportaría información nueva.
- Las barras usan un azul más saturado que el de la interfaz. Un color de datos poco saturado acaba leyéndose como gris cuando se ve en pequeño.
- Los números se agrupan siempre en miles. El español no pone separador en cifras de cuatro dígitos, pero en un panel se comparan de un vistazo y conviene que todos se vean igual.

## Datos

`js/data.js` contiene los datos de ejemplo. Son inventados para la demo: cada fila es un producto con sus unidades e ingresos en un mes.

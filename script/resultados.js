document.addEventListener('DOMContentLoaded', async () => {
    const resultadoModelo = document.getElementById('ResultadoModelo');
    const resultadoProductividad = document.getElementById('ResultadoProductividad');
    const resultadoNPI = document.getElementById('ResultadoNPI');
    const resultadoYield = document.getElementById('ResultadoYield');
    const resultadoOEE = document.getElementById('ResultadoOEE');
    const generarPDFBtn = document.getElementById('generarPDF');
    const regresarBtn = document.getElementById('regresarBtn');
    const resultadoMaquinas = document.getElementById('ResultadoMaquinas');
    
    // Aquí puedes inicializar la instancia del gráfico si la necesitas fuera de los try/catch
    let myChartInstance = null;

    try {
        const formResponses = await window.getAllDataFromIndexedDB(window.STORE_FORM_ADICIONAL);

        if (formResponses && formResponses.length > 0) {
            const latestResponse = formResponses[0];

            console.log("Datos leídos de IndexedDB en resultados.js:", latestResponse);

            const cambioModelo = latestResponse.Cambiomodelo ?? 0;
            const cambioXdia = latestResponse.Xdia ?? 0;
            const cambioYi = latestResponse.Cambioyi ?? 0;
            const eficiencia = latestResponse.Eficiencia ?? 0;
            const oee = latestResponse.OEE ?? 0;
            const MaquinasUsadas = latestResponse.resultadoMaquinas ?? 0;

            resultadoModelo.textContent = cambioModelo.toFixed(2);
            resultadoNPI.textContent = cambioXdia.toFixed(2);
            resultadoYield.textContent = `${(cambioYi * 100).toFixed(2)}%`;
            resultadoProductividad.textContent = `${(eficiencia * 100).toFixed(2)}%`;
            resultadoOEE.textContent = `${(oee * 100).toFixed(2)}%`;
            //resultadoMaquinas.textContent = MaquinasUsadas;
        } else {
            console.warn("No se encontraron datos en STORE_FORM_ADICIONAL.");
            resultadoModelo.textContent = 'N/A';
            resultadoNPI.textContent = 'N/A';
            resultadoYield.textContent = 'N/A';
            resultadoProductividad.textContent = 'N/A';
            resultadoOEE.textContent = 'N/A';
            resultadoMaquinas.textContent = 'N/A';
        }
    } catch (error) {
        console.error("Error al cargar datos del formulario:", error);
        resultadoModelo.textContent = 'Error';
        resultadoNPI.textContent = 'Error';
        resultadoYield.textContent = 'Error';
        resultadoProductividad.textContent = 'Error';
        resultadoOEE.textContent = 'Error';
        resultadoMaquinas.textContent = 'Error';
    }

    try {
        const demandaData = await window.getAllDataFromIndexedDB(window.STORE_DEMANDA);
        const capacidadData = await window.getAllDataFromIndexedDB(window.STORE_CAPACIDAD);

        if (demandaData && demandaData.length > 0){
            const lastestDemanda = demandaData [0];
            const maquinasUsadas = lastestDemanda.maquinasUsadas ?? 0;
            resultadoMaquinas.textContent =maquinasUsadas;
        }else {
            console.warn ("No se encontraron datos en STORE_DEMANDA");
            resultadoMaquinas.textContent = 'N/A';
        }


        if (demandaData && demandaData.length > 0 && capacidadData && capacidadData.length > 0) {
            const ctx = document.getElementById('grafica').getContext('2d');
            const meses = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre', 'Enero', 'Febrero'];
            const sumaPorMes = {};
            meses.forEach(mes => sumaPorMes[mes] = 0);

            demandaData.forEach(row => {
                meses.forEach(mes => {
                    const valor = parseFloat((row[mes] || '0').toString().replace(/,/g, '').trim());
                    if (!isNaN(valor)) {
                        sumaPorMes[mes] += valor;
                    }
                });
            });

            // *** LÓGICA DE CÁLCULO PARA EL NUEVO GRÁFICO ***
            const nuevoCalculoPorMes = [];
            const mesIndexMap = {
                'Enero': 0, 'Febrero': 1, 'Marzo': 2, 'Abril': 3, 'Mayo': 4, 'Junio': 5,
                'Julio': 6, 'Agosto': 7, 'Septiembre': 8, 'Octubre': 9, 'Noviembre': 10, 'Diciembre': 11
            };

            meses.forEach(mes => {
                const demandaDelMes = sumaPorMes[mes];
                let sumaTotalPorMes = 0;
                
                // Obtenemos los días del mes actual para el cálculo
                const today = new Date();
                const currentYear = today.getFullYear();
                const monthIndex = mesIndexMap[mes];
                const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();

                if (demandaDelMes > 0 && daysInMonth > 0) {
                    capacidadData.forEach(filaCapacidad => {
                        const uphReal = parseFloat(filaCapacidad['UPH Real']) || 0;
                        if (uphReal > 0) {
                            // fórmula: UPH Real / (demanda por mes) * 60 / daysInMonth
                            const resultado = (uphReal / demandaDelMes) * 60 / daysInMonth;
                            sumaTotalPorMes += resultado;
                        }
                    });
                }
                nuevoCalculoPorMes.push(sumaTotalPorMes);
            });
            // *** FIN DE LA LÓGICA DE CÁLCULO ***

            const labels = meses;
            const dataValues = labels.map(mes => sumaPorMes[mes]);

            if (myChartInstance) {
                myChartInstance.destroy();
            }

            myChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Demanda por Mes',
                        data: dataValues,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    },
                    // *** NUEVO DATASET PARA EL CÁLCULO REQUERIDO ***
                    {
                        label: 'UPH Requerido por Mes',
                        data: nuevoCalculoPorMes,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Demanda / UPH Requerido'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Mes'
                            }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error("Error al cargar gráfico:", error);
    }

    generarPDFBtn.addEventListener('click', () => {
        const {
            jsPDF
        } = window.jspdf;
        const contenedor = document.querySelector('.container');

        html2canvas(contenedor).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const doc = new jsPDF();
            const imgProps = doc.getImageProperties(imgData);
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            doc.save(`reporte_scc_${new Date().toISOString().slice(0, 10)}.pdf`);
        });
    });

    regresarBtn.addEventListener('click', async () => {
        try {
            await window.clearObjectStore(window.STORE_DEMANDA);
            await window.clearObjectStore(window.STORE_CAPACIDAD);
            await window.clearObjectStore(window.STORE_FORM_ADICIONAL);
            window.location.href = './index.html';
        } catch (error) {
            console.error('Error al borrar datos:', error);
        }
    });
});
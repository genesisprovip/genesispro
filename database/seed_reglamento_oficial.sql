-- Reglamento Oficial de Peleas de Gallos - Mexico
-- Cargado como reglamento oficial (es_oficial = true, evento_id = NULL = aplica a todos)

-- Limpiar reglamento oficial anterior si existe
DELETE FROM reglamentos WHERE es_oficial = true AND evento_id IS NULL;

-- CAPITULO 1: JUEZ DE ARENA
INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Autoridad del Juez de Arena',
'El juez de arena es la maxima autoridad en el palenque. Sus veredictos son inapelables e irrevocables. El juez dirige completamente el desarrollo de la pelea, vigilando el cumplimiento de todas las reglas establecidas. El juez sentado funge como su asistente.',
'Juez de Arena', '1', ARRAY['juez', 'arena', 'autoridad', 'veredicto', 'sentencia', 'inapelable'], true);

INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Facultades del Juez',
'El juez de arena podra imponer las siguientes sanciones: perdida de la pelea, suspension temporal o permanente del soltador, o suspension del evento. Solo el juez de arena y los soltadores pueden permanecer dentro del redondel durante la pelea.',
'Juez de Arena', '2', ARRAY['juez', 'sancion', 'suspension', 'penalidad', 'castigo', 'facultades'], true);

-- CAPITULO 2: EL PALENQUE / ARENA
INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Especificaciones del Palenque',
'La pelea se lleva a cabo en una arena, palenque o renidero circular de 3.5 metros de diametro por 80 centimetros de alto. El redondel debe contener lineas concentricas: interior de 60 cm por lado y exterior de 3 metros, con lineas de prueba marcadas para determinar ganadores.',
'El Palenque', '3', ARRAY['palenque', 'arena', 'redondel', 'medidas', 'diametro', 'renidero', 'dimensiones'], true);

-- CAPITULO 3: PESOS
INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Pesos Reglamentarios',
'Los pesos reglamentarios van de 1.900 kg a 2.680 kg. Los gallos de 2.800 gramos o mas pueden carearse con los de cualquier peso, considerandose como capotes o pesos libres. Los gallos tuertos o lisiados no podran pelear.',
'Pesos', '4', ARRAY['peso', 'kilogramo', 'gramo', 'capote', 'libre', 'tuerto', 'lisiado', 'pesaje'], true);

INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Diferencias de Peso Permitidas',
'Con navaja, la diferencia de peso no puede exceder 60 gramos (hasta 100g con handicap de colocacion en pata derecha). Con navaja corta, la diferencia maxima es de 30 gramos, con un maximo total de 50g. Si un gallo falla el peso por menos de 100 gramos, la pelea procede con el gallo mas ligero armado en la pata derecha.',
'Pesos', '5', ARRAY['diferencia', 'peso', 'gramo', 'handicap', 'navaja', 'tolerancia', 'fallo'], true);

INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Orden de Peleas por Peso',
'Las peleas deben iniciarse con los pesos de menor a mayor, tanto para derbis como para compromisos con pesos continuos.',
'Pesos', '6', ARRAY['orden', 'peso', 'menor', 'mayor', 'derby', 'compromiso'], true);

-- CAPITULO 4: NAVAJAS
INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Especificaciones de Navaja',
'Los gallos pelearan con navaja de una pulgada y pulgada 2 lineas como maximo, medidas permitidas unicamente en la Republica Mexicana. Las navajas deben dar la escuadra de 90 grados, esto es, con los arillos o patas de la navaja sobre una superficie plana.',
'Navajas', '7', ARRAY['navaja', 'pulgada', 'medida', 'escuadra', 'filo', 'arillo'], true);

INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Filo y Tipo de Navaja',
'Las navajas podran ser de uno o dos filos, dependiendo del acuerdo entre participantes u organizadores de la pelea. El hilo que se podra utilizar para amarrar la navaja a la botana puede ser de cualquier material, las unicas condiciones son que el tejido sea delgado y plano.',
'Navajas', '8', ARRAY['filo', 'navaja', 'hilo', 'botana', 'amarrar', 'tejido', 'acuerdo'], true);

INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Botanas y Cambio de Navaja',
'Las botanas (proteccion) no pueden exceder 4mm de grosor para navajas estandar, ni 10mm para cortes de especialidad. Es obligatorio el cambio de navaja a los 3 minutos de iniciada la pelea.',
'Navajas', '9', ARRAY['botana', 'grosor', 'proteccion', 'cambio', 'navaja', 'minutos'], true);

-- CAPITULO 5: DESARROLLO DE LA PELEA
INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Condiciones del Gallo',
'Los gallos deben presentarse en buenas condiciones, limpios y libres de enfermedad o sustancias. El espolon contrario debe estar cortado al ras, sin punta ni filo, con una medida no mayor al espolon contrario.',
'Desarrollo de la Pelea', '10', ARRAY['condicion', 'gallo', 'limpio', 'enfermedad', 'sustancia', 'espolon', 'presentar'], true);

INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Duracion de la Pelea',
'La duracion maxima de cada pelea sera de 30 minutos contados a partir del momento en que suelten los gallos. Para compromisos sera de 15 o 20 minutos. Para derbis sera de 10, 12 o 15 minutos segun la cantidad de participantes y acuerdos de la convocatoria.',
'Desarrollo de la Pelea', '11', ARRAY['duracion', 'tiempo', 'minutos', 'compromiso', 'derby', 'reloj', 'cuanto', 'dura'], true);

INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Inicio y Suelta',
'Los soltadores no pueden avanzar hasta que los gallos hagan primer contacto. Los gallos no pueden ser retirados una vez presentados, excepto para alternar zonas. No se permite empujar al gallo, soltar prematuramente, ni atraer la atencion del ave.',
'Desarrollo de la Pelea', '12', ARRAY['suelta', 'soltador', 'contacto', 'avanzar', 'retirar', 'empujar', 'soltar'], true);

INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Descansos y Revision',
'Se permiten periodos de descanso de 30 segundos entre enfrentamientos, con 15 segundos de preparacion para limpieza e inspeccion de navaja. Los soltadores deben mantener una distancia de 2 metros excepto cuando revisan dano en la navaja.',
'Desarrollo de la Pelea', '13', ARRAY['descanso', 'segundo', 'limpieza', 'inspeccion', 'revision', 'distancia', 'preparacion'], true);

-- CAPITULO 6: RESULTADOS Y CONDICIONES DE PERDIDA
INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Condiciones de Perdida',
'Un gallo pierde cuando: 1) Gallo muerto - presenta movimientos coordinados de muerte o senales minimas de vida. 2) Fondo (dar tierra) - permanece recostado por 10 segundos con el pico tocando el suelo. 3) Huido - abandona el combate dos veces consecutivas. 4) Rebeldia - el soltador se niega a presentar al ave despues del periodo de asistencia de 15 segundos.',
'Resultados', '14', ARRAY['perder', 'pierde', 'muerte', 'muerto', 'fondo', 'tierra', 'huido', 'rebeldia', 'abandona', 'derrota', 'gana'], true);

INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Empates (Tablas)',
'Se declaran tablas cuando ambos gallos tocan tierra simultaneamente. Un gallo muerto vence a un gallo huido. Si ambos gallos quedan sin poder continuar al mismo tiempo, se declara empate.',
'Resultados', '15', ARRAY['empate', 'tabla', 'tablas', 'simultaneo', 'ambos', 'tierra'], true);

INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Conteo y Determinacion',
'Cuando un gallo cae, el juez inicia un conteo de 10 segundos. Si el gallo no se levanta y pelea en ese tiempo, pierde la pelea. Las lineas de prueba marcadas en el redondel ayudan a determinar la posicion y el resultado.',
'Resultados', '16', ARRAY['conteo', 'segundo', 'caer', 'levantar', 'contar', 'diez', 'tiempo'], true);

-- CAPITULO 7: SOLTADORES
INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Responsabilidades del Soltador',
'Los soltadores deben mantener identificacion visible y verificar pesos y navajas del oponente. Deben proporcionar a su gallo toda la asistencia legitima posible para contribuir a ganar la pelea. Los representantes de partido asumen responsabilidad por la conducta del soltador.',
'Soltadores', '17', ARRAY['soltador', 'identificacion', 'verificar', 'asistencia', 'representante', 'partido', 'conducta'], true);

INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Prohibiciones del Soltador',
'El soltador no puede: soplar al gallo, meter los dedos en las heridas, aplicar sustancias, cubrir heridas con las manos, retrasar intencionalmente la pelea, ni protestar las decisiones del juez. Cualquier infraccion puede resultar en perdida de la pelea y suspension.',
'Soltadores', '18', ARRAY['prohibido', 'prohibicion', 'soplar', 'herida', 'sustancia', 'retrasar', 'protesta', 'infraccion', 'trampa'], true);

-- LEGALIDAD Y PERMISOS
INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial) VALUES
(NULL, 'Permisos y Legalidad',
'Las peleas de gallos con cruce de apuestas requieren permiso de la Direccion General de Juegos y Sorteos (SEGOB). El permiso se otorga en 10 dias habiles. Los permisos para escenarios temporales tienen vigencia maxima de 28 dias. La Suprema Corte (febrero 2026) ratifico la legalidad de las peleas de gallos, revirtiendo prohibiciones municipales.',
'Legalidad', '19', ARRAY['permiso', 'legal', 'legalidad', 'segob', 'juegos', 'sorteos', 'apuesta', 'ley', 'corte', 'prohibicion'], true);

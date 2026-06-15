# Prompts de la sesión

## Prompt 1 — Suite de tests Jest para inserción de candidatos

Eres un Senior Software Engineer especializado en QA y testing 

Lee el archivo README.md de la aplicación

Actualmente en la aplicación existe una versión básica de la funcionalidad de inserción de nuevos candidatos. Se trata de un componente clave de un ATS, ya que los datos de candidatos son el activo más valioso. En el ejercicio se utilizaba un formulario web para insertar nuevos candidatos, que puede ser una interfaz muy útil para RRHH y hiring managers, pero se recibirán via API desde múltiples fuentes, como aplicación directa del candidato, o sistemas de parsing automatizado.

Tu misión será crear una suite de tests unitarios en Jest para la funcionalidad de insertar candidatos en base de datos. Apóyate en la IA y utiliza el contexto del proyecto para identificar aquellos tests que puedan ser relevantes en este caso.

Pista 1: hay 2 familias principales de tests, recepción de los datos del formulario, y guardado en la base de datos. Queremos ver tests que cubran ambos procesos con al menos un test.


Aplica las buenas prácticas sobre TDD:

1. Convención de nombres
Utiliza nombres de tests descriptivos que expliquen qué comportamiento se está verificando, no qué función se está llamando.

Una convención muy extendida es la de 3 partes: <unidad>_<escenario>_<resultadoEsperado> o su variante en lenguaje natural:

// ❌ Poco informativo
test('reverseString works', () => { ... });

// ✅ Describe comportamiento
test('reverseString returns empty string when input is empty', () => { ... });

// ✅ Estilo BDD con describe + it
describe('reverseString', () => {
  it('should return empty string when input is empty', () => { ... });
  it('should preserve unicode characters when reversing', () => { ... });
});
Cuando un test falla en CI, el nombre es lo primero que ves. Un buen nombre te ahorra abrir el archivo.

2. Patrón Arrange-Act-Assert (AAA) o Given-When-Then
Estructura cada test en 3 bloques claramente separados. Mejora la legibilidad y reduce la carga cognitiva al revisar tests ajenos (o generados por IA).

Arrange (Organizar): configura todo lo necesario: crea objetos, prepara fixtures, configura mocks, inicializa el entorno.

Act (Actuar): ejecuta una sola acción. Si necesitas varias llamadas, probablemente estés testeando más de una cosa.

Assert (Afirmar): verifica el resultado mediante aserciones que comparen lo obtenido con lo esperado.

test('createCandidate persists candidate with generated id', () => {
  // Arrange
  const repo = new InMemoryCandidateRepository();
  const service = new CandidateService(repo);
  const input = { name: 'Ada Lovelace', email: 'ada@example.com' };

  // Act
  const result = service.create(input);

  // Assert
  expect(result.id).toBeDefined();
  expect(repo.findById(result.id)).toMatchObject(input);
});
En contextos BDD (stakeholders de negocio, features user-facing) puedes usar la variante Given-When-Then, que es el mismo patrón con otra nomenclatura. Elige una y sé consistente.

⚠ Regla de oro: un test = un comportamiento. Si tienes varios // Act seguidos, parte el test en dos.

3. Parametrización
Si tienes varios tests que siguen la misma estructura pero cambian entradas/salidas, parametrízalos. Evitas duplicación y, más importante, añadir un caso nuevo es una línea, no un test nuevo.

// Vitest (y también Jest: misma API)
import { describe, test, expect } from 'vitest';
import { reverseString } from './reverseString';

describe('reverseString', () => {
  test.each([
    ['hello', 'olleh'],
    ['world', 'dlrow'],
    ['', ''],
    ['a', 'a'],
    ['hello, world!', '!dlrow ,olleh'],
  ])('reverses "%s" into "%s"', (input, expected) => {
    expect(reverseString(input)).toBe(expected);
  });
});
📌 Nota sobre Vitest vs Jest: ambos comparten prácticamente la misma API. En 2025-2026 Vitest se ha consolidado como estándar en proyectos con Vite (React, Vue, Svelte modernos) por su arranque nativo con ESM/TypeScript y velocidad. Jest sigue siendo dominante en React Native y en codebases legacy. Si empiezas un proyecto nuevo con Vite, usa Vitest; si heredas un proyecto con Jest, no migres por migrar.

4. Mensajes descriptivos en aserciones
Cuando una aserción falle, el mensaje que ves en consola debería bastarte para entender qué pasó, sin abrir el código.

describe('reverseString — casos ampliados', () => {
  test.each([
    ['hello',          'olleh',          'ASCII básico'],
    ['こんにちは',       'はちにんこ',       'Caracteres japoneses'],
    ['😊👍',           '👍😊',            'Emojis'],
    ['  leading  ',   '  gnidael  ',     'Espacios preservados'],
  ])('%s → %s (%s)', (input, expected, label) => {
    expect(reverseString(input), `Falló caso: ${label}`).toBe(expected);
  });
});
Aplica también a las aserciones normales: prefiere toHaveLength(3) sobre toBe(true), toMatchObject({...}) sobre múltiples toBe sueltos. Cada matcher trae su propio mensaje de error más rico.

5. Pruebas de casos límite (edge cases) con ayuda de IA
Probar solo el "camino feliz" es la forma más rápida de que un bug llegue a producción. Los casos límite son donde vive la mayoría de los bugs.

Con el auge de la IA, los casos obvios los cubrirá el asistente casi automáticamente. Tu valor está en aportar lo que la IA no puede inferir solo leyendo el código: conocimiento del dominio y lógica de negocio.

Ejemplo: en una app para clínicas médicas, puedes pedir a la IA múltiples validaciones para cada campo del formulario (textos, números, fechas, emails, direcciones…). Sin embargo, es improbable que, sin todo el contexto del problema, deduzca que no puede haber dos historiales clínicos abiertos para el mismo paciente. Esa regla vive en la cabeza del product manager, no en el código. Ahí es donde tú añades valor.

Dicho esto, la IA también es un excelente potenciador de creatividad para descubrir casos que no habíamos considerado. Una pregunta tan simple como esta puede abrirte los ojos:

¿Qué otros casos límite se te ocurren que puedan fallar para reverseString?

Respuesta típica de un asistente 🤖

Cadenas con caracteres Unicode compuestos (grafemas, no code points)

Emojis con modificadores de piel o ZWJ (👨‍👩‍👧‍👦)

Cadenas con caracteres de escape

Cadenas extremadamente largas (GB de memoria)

Cadenas mezclando números, símbolos, RTL (árabe, hebreo)

Espacios al principio o al final

Combinaciones mayúsculas/minúsculas

null / undefined / no-strings

describe('reverseString — edge cases', () => {
  test.each([
    ['hello',            'olleh',            'ASCII'],
    ['こんにちは',         'はちにんこ',          'Japonés'],
    ['😊👍',             '👍😊',              'Emojis simples'],
    ['Line\\\\nBreak',     'kaerB\\\\neniL',      'Escape'],
    ['   spaces   ',     '   secaps   ',      'Espacios extremos'],
    ['12345',            '54321',             'Números'],
  ])('"%s" → "%s" (%s)', (input, expected, label) => {
    expect(reverseString(input)).toBe(expected);
  });

  test.each([null, undefined, 42, {}])('rejects non-string input: %p', (input) => {
    expect(() => reverseString(input)).toThrow(TypeError);
  });
});
🧪 Prueba esto ahora: abre tu último PR y pídele a tu asistente IA: "Dame 5 edge cases para esta función que yo probablemente no haya considerado, priorizando los relacionados con el dominio del negocio." Anota cuáles no habías cubierto.

6. Mockea en las fronteras, no en las entrañas
Las pruebas unitarias no deben depender de infraestructura externa (BD, APIs de terceros, sistema de ficheros, reloj). Pero over-mockear es un anti-patrón tanto o más grave: tests que mockean todo acaban validando el propio mock, no el código.

La regla práctica: mockea en los bordes arquitectónicos (llamadas HTTP salientes, BD, servicios cloud) y deja lo demás real si es rápido y determinista.

Backend (Node.js/Express) — inyección de dependencias
En lugar de mockear el ORM, inyecta un repositorio en memoria. Así testeas la lógica real sin tocar BD:

// candidate.service.test.js
import { describe, test, expect } from 'vitest';
import { CandidateService } from './candidate.service';

class InMemoryCandidateRepo {
  constructor() { this.data = new Map(); }
  save(c)       { this.data.set(c.email, c); return c; }
  findByEmail(e){ return this.data.get(e) ?? null; }
}

describe('CandidateService.create', () => {
  test('rejects duplicate emails', async () => {
    const repo = new InMemoryCandidateRepo();
    const service = new CandidateService(repo);
    await service.create({ email: 'ada@example.com', name: 'Ada' });

    await expect(
      service.create({ email: 'ada@example.com', name: 'Ada 2' })
    ).rejects.toThrow('DuplicateEmailError');
  });
});
Para tests de endpoint HTTP usa Supertest, que levanta tu app Express sin abrir puerto:

// candidates.routes.test.js
import request from 'supertest';
import { app } from '../app';

test('POST /candidates returns 201 with new candidate', async () => {
  const res = await request(app)
    .post('/candidates')
    .send({ name: 'Ada Lovelace', email: 'ada@example.com' });

  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ name: 'Ada Lovelace' });
  expect(res.body.id).toBeDefined();
});
Para tests de integración contra una BD real pero aislada, usa Testcontainers (levanta un Postgres efímero en Docker). Es el estándar actual para evitar mocks frágiles sin ensuciar tu BD local.

Frontend (React) — mocks de red con MSW
Para mockear llamadas HTTP desde el frontend, Mock Service Worker (MSW) es el estándar de facto. Interceptas en la capa de red (no en fetch/axios), así los mismos mocks sirven para Vitest, Storybook y desarrollo local:

// handlers.js
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/candidates', () =>
    HttpResponse.json([{ id: 1, name: 'Ada' }])
  ),
];
🚫 Anti-patrón frecuente con IA: pedirle a un asistente "mockea todo lo necesario para este test" y acabar con 40 líneas de mocks para testear 5 líneas de código. Si tu mock es más complejo que lo que testeas, probablemente debas testear a un nivel más alto (integración) en vez de unitario.

7. Elige el tipo de test por valor, no por dogma
La pirámide clásica de tests (muchos unit, algunos integration, pocos e2e) sigue siendo un buen default, pero el consenso actual ha evolucionado hacia el "Testing Trophy" de Kent C. Dodds, que prioriza tests de integración: son los que mejor ratio confianza/coste dan.

        /\\
       /E2E\\        ← Pocos, caros, pero validan flujos críticos reales
      /──────\\
     /Integr.\\     ← La mayoría de tu inversión
    /──────────\\
   /   Unit    \\   ← Solo para lógica compleja y pura
  /──────────────\\
 /  Static (TS,   \\ ← Tipos, lint, formatters: gratis y constantes
/   ESLint, etc)   \\
────────────────────
Reglas prácticas:

Static first: TypeScript + ESLint + Prettier te ahorran una categoría entera de bugs. Son "tests" que se ejecutan mientras escribes.

Unit tests: solo para lógica con ramificaciones (validaciones, cálculos, transformaciones). Para código que solo orquesta llamadas, no suelen aportar.

Integration tests (Supertest + Testcontainers, Vitest + MSW): donde más retorno obtienes.

E2E (Playwright es el estándar actual, por encima de Cypress en adopción y velocidad): solo para flujos críticos de negocio (login, checkout, alta).

8. Code coverage: una señal, no un objetivo
El coverage es útil como alarma de zonas sin tests, pero exigir "90% obligatorio" fabrica tests vacíos que solo ejecutan código sin validar nada. Un test que solo llama a la función sin expect real da coverage y cero confianza.

Mira el coverage relativo (¿qué módulos críticos están por debajo del resto?) más que el absoluto.

Complementa con mutation testing (Stryker en JS/TS) para saber si tus tests realmente detectan cambios en el código, no solo lo ejecutan.

Excluye del coverage lo trivial (DTOs, barrel files, tipos).

9. Tests como contrato con los agentes IA (TDD revive en 2026)
Un cambio importante respecto a hace 2 años: TDD ha recuperado relevancia gracias a los agentes de coding. Escribir el test primero le da al agente (Claude Code, Cursor, Copilot) un criterio de salida objetivo: el código está bien cuando el test pasa. Sin ese criterio, el agente "alucina" soluciones que parecen correctas pero no lo son.

Workflow recomendado con Claude Code u otro agente:

Red: tú escribes (o refinas con la IA) los tests que describen el comportamiento deseado.

Green: pides al agente que implemente hasta que los tests pasen.

Refactor: revisas el código generado y le pides mejoras concretas con los tests como red de seguridad.

🔬 Dato: el informe DORA 2025 de Google encontró que TDD amplifica los beneficios de la adopción de IA en equipos de alto rendimiento. No es nostalgia: es el mecanismo que evita que los agentes entreguen código que "parece bien" pero no lo está.

🧪 Prueba esto ahora: en tu próxima feature pequeña, invierte el orden. Escribe el test primero, pásaselo a Claude Code con un /test o prompt explícito, y observa cuántas iteraciones necesita vs tu flujo habitual.

10. Cuándo NO escribir tests
En un curso de buenas prácticas, esta sección suele faltar, pero es clave para developers senior:

Prototipos desechables y spikes de investigación: si el código va a la papelera en 3 días, los tests también.

Código trivial sin lógica: getters, setters, DTOs, wrappers que solo delegan. El TypeScript ya te protege ahí.

Código que va a cambiar mañana: si estás validando un diseño con usuarios, testea a nivel e2e la feature, no los detalles internos.

Tests de implementación: tests acoplados a cómo funciona el código (no qué hace) son los primeros que se rompen al refactorizar. Testea comportamiento observable.

La pregunta correcta no es "¿tiene tests?" sino "¿los tests que tiene dan confianza para cambiar este código?".


Usa también la tecnica fake it till you make it famosa en TDD:


Fake It 'Til You Make It es una técnica en el desarrollo guiado por pruebas (TDD) donde, al no tener clara la implementación de una funcionalidad, se "finge" la implementación inicial. Esto se hace devolviendo valores estáticos esperados para pasar el test. Esta técnica permite a los desarrolladores avanzar en el proceso de TDD sin estar bloqueados por la incertidumbre de la implementación. Una vez que el test inicial pasa, se va refinando la implementación hasta que sea funcional y correcta.

Es uno de los tres Green Bar Patterns definidos por Kent Beck en TDD by Example: Obvious Implementation (cuando sabes exactamente qué código escribir), Fake It (cuando no tienes clara la implementación) y Triangulation (cuando necesitas forzar la generalización añadiendo un segundo test). Fake It es la técnica más útil cuando el siguiente paso no está claro o cuando quieres validar primero el contrato antes de pensar en la lógica.

Ventajas:
Reduce la incertidumbre: Permite continuar con el desarrollo incluso si no se tiene una solución completa desde el principio.

Facilita el enfoque incremental: Permite construir la funcionalidad de forma gradual y mejorarla iterativamente.

Acelera el ciclo de feedback: Proporciona feedback rápido sobre los tests, asegurando que la dirección del desarrollo es correcta.

Es la base del Test-First Prompting con IA: En 2026, escribir el test primero y pedir a un agente de IA que implemente el código mínimo para pasarlo se ha convertido en la forma más efectiva de dirigir agentes como Claude Code, GitHub Copilot o Cursor. El test actúa como especificación ejecutable que la IA puede usar como objetivo binario.

Desventajas:
Riesgo de complacencia: Si no se continúa refinando la implementación, se puede quedar con código incompleto o incorrecto.

Código temporal: La implementación inicial es temporal y debe ser reemplazada, lo que requiere disciplina para evitar dejar código "fake" en producción.

Con IA el riesgo se amplifica: Los agentes de IA tienden a generar tests que validan lo que el código hace en vez de lo que debería hacer. Si no tienes disciplina, la IA puede incluso modificar tus tests para que pasen en lugar de arreglar la implementación. La regla de oro: el humano define el test (el qué), la IA implementa el código (el cómo).

Ejemplo Práctico:
Consideremos una función que debe obtener el nombre completo de un usuario. Usamos Vitest (compatible con la misma sintaxis de Jest) como framework de testing. Primero, escribimos un test que verifica el comportamiento esperado:

// users.test.js
import { describe, it, expect } from 'vitest';
import { getFullName } from './users.js';

describe('getFullName', () => {
  it('obtiene el nombre completo del usuario', () => {
    expect(getFullName('John', 'Doe')).toBe('John Doe');
  });
});
Para pasar el test, devolvemos un valor estático:

// users.js - Implementación falsa
export function getFullName(firstName, lastName) {
  return 'John Doe'; // Fake implementation
}
En este ejemplo, aunque la función getFullName no está implementada correctamente, pasa el test inicial devolviendo el valor esperado de forma estática. A medida que avanzamos, reemplazamos la implementación "fake" por una que utilice los parámetros proporcionados:

// users.js - Implementación refinada
export function getFullName(firstName, lastName) {
  return `${firstName} ${lastName}`;
}
Con esta implementación refinada, la función ahora cumple con los requisitos y pasa el test de manera correcta y dinámica.

Fake It con Agentes de IA: el flujo moderno
En 2026, la técnica Fake It toma una nueva dimensión cuando trabajas con agentes de IA. El flujo recomendado para aprovechar al máximo la combinación TDD + IA:

Tú escribes el test (defines el comportamiento esperado). Puedes pedir ayuda a la IA para redactarlo, pero la revisión es tuya.

Pides a la IA la implementación mínima (el "Fake It"). La IA generará código con valores hardcodeados — exactamente el patrón que buscas.

Añades un segundo test para forzar la generalización (Triangulation). La IA ya no puede hardcodear; se ve forzada a derivar una estructura real.

Refactorizas hacia producción manteniendo todos los tests verdes.

Regla crítica: nunca permitas que el agente modifique tus tests sin revisión explícita. Protege los tests como si fueran la especificación firmada del cliente — porque lo son.

Configura tus herramientas para que respeten TDD
Los agentes de IA no siguen TDD por defecto; tienden a escribir el código primero y los tests después (o a escribir ambos a la vez sin disciplina). Para imponer el flujo correcto, usa archivos de configuración:

Claude Code: crea un archivo CLAUDE.md en la raíz del proyecto con las reglas del ciclo Red-Green-Refactor.

Cursor: usa .cursorrules con instrucciones equivalentes.

GitHub Copilot: usa .github/copilot-instructions.md para su agent mode.

Ejemplo mínimo de reglas:

## Reglas de desarrollo
- Sigue siempre el ciclo TDD: Red → Green → Refactor
- Escribe el test más simple que falle primero
- Implementa solo el código mínimo para pasar el test (puedes hardcodear — Fake It)
- Nunca modifiques tests existentes sin aprobación explícita
- Un test a la vez, commits frecuentes
Importancia en el Desarrollo Ágil:
La técnica Fake It 'Til You Make It es especialmente valiosa en entornos de desarrollo ágil donde los requisitos pueden cambiar rápidamente y es crucial mantener el ritmo de desarrollo. Este enfoque permite a los desarrolladores obtener una "victoria rápida" al ver que los tests pasan desde el inicio, lo cual puede ser motivador y ayuda a mantener el progreso constante. En equipos ágiles, la capacidad de adaptarse y evolucionar rápidamente es fundamental, y esta técnica proporciona una manera estructurada de manejar la incertidumbre sin detener el flujo de trabajo.

En el contexto de desarrollo asistido por IA, su valor se multiplica. Kent Beck (autor original de TDD) distingue entre "vibe coding" — pedir a la IA que genere código y esperar que funcione — y "augmented coding" — mantener la disciplina de ingeniería (tests primero, implementación después, refactorización continua) mientras se aprovecha la velocidad de la IA. Fake It es una de las técnicas puente entre ambos mundos: te permite avanzar rápido sin perder el control sobre el diseño.

Colaboración y Confianza:
Además, Fake It 'Til You Make It es útil cuando se trabaja en colaboración con otros desarrolladores — o con agentes de IA como colaboradores. Al tener pruebas que pasan, incluso con implementaciones temporales, se facilita la integración continua y se mantiene la confianza en que el código base no está roto. Esto es crucial en proyectos grandes donde múltiples equipos pueden estar trabajando en diferentes partes del sistema simultáneamente. Mantener un código base estable y que pase todos los tests es vital para la coordinación y la eficiencia del equipo.

Disciplina y Mejora Continua:
Es importante no quedarse con la implementación falsa por mucho tiempo. La verdadera implementación debe seguir tan pronto como sea posible para asegurar que el código final sea robusto y funcional. La disciplina en TDD requiere que los desarrolladores sigan refinando su código hasta que cumpla con todos los requisitos especificados en las pruebas. Este enfoque incremental y disciplinado no solo mejora la calidad del código, sino que también asegura que cada funcionalidad esté completamente probada y validada antes de considerarla completa.

Esta disciplina es aún más crítica con IA: los agentes pueden completar features enteras en minutos, y si no pones barreras (tests primero, revisión de cambios en tests, commits atómicos) terminarás con código que "parece funcionar" pero que nadie — ni tú ni la IA — entiende realmente.

Ejemplo de Evolución: endpoint Express con Supertest
Consideremos un caso más complejo donde se necesita implementar un endpoint Node.js + Express para calcular el total de una factura. Usamos Supertest para testear el endpoint HTTP. Empezamos con una implementación falsa para pasar el test inicial:

// invoices.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './app.js';

describe('POST /invoices/calculate', () => {
  it('calcula el total de la factura', async () => {
    const response = await request(app)
      .post('/invoices/calculate')
      .send({ items: [100, 200, 300] });

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(600);
  });
});
// app.js - Implementación falsa
import express from 'express';

export const app = express();
app.use(express.json());

app.post('/invoices/calculate', (req, res) => {
  res.json({ total: 600 }); // Fake implementation
});
Aunque esta implementación pasa el test, no es funcional. Añadimos un segundo test (Triangulation) para forzar la generalización:

it('calcula el total con valores diferentes', async () => {
  const response = await request(app)
    .post('/invoices/calculate')
    .send({ items: [50, 75, 25] });

  expect(response.body.total).toBe(150);
});
Ahora la implementación hardcodeada falla. Refinamos:

// app.js - Implementación refinada
import express from 'express';

export const app = express();
app.use(express.json());

app.post('/invoices/calculate', (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items must be an array' });
  }

  const total = items.reduce((sum, item) => sum + item, 0);
  res.json({ total });
});
Este ejemplo muestra cómo Fake It 'Til You Make It, combinado con Triangulation, permite comenzar con una solución simple y luego iterar hacia una implementación correcta y robusta — guiados siempre por los tests.

---

## Prompt 2 — Revisión de la implementación

Revisé la implementación, Faltan cosas y la consigna no se cumplió:

Bugs que los tests no detectaban:
- addCandidate no es transaccional → candidato a medio guardar. Envuélvelo en prisma.$transaction.
- title rechaza chars válidos.
- Email sin límite de 255.
- Controlador muerto sin usar.

Tests que faltan:
- Validación: bordes válidos (nombre 2/100, acentos/ñ), lastName, teléfono opcional, cv vacío, fechas malformadas.
- Candidate.save() anidado y error de conexión sin testear.
- Cero tests de Education, WorkExperience, Resume. 
- Servicio: transacción + rollback.
  
Config: sin umbral de cobertura ni collectCoverageFrom.

Consigna: pedí TDD con "fake it till you make it" y entregaste test-after. Quiero ver el ciclo red-green real.

---

## Prompt 3 — Exportar prompts

pon todos los prompts que te he mandado en un archivo prompts.md

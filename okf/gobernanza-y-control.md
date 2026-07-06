---
title: Gobernanza y control de agentes de IA
description: Shadow AI, supervisión de agentes, auditoría, human-in-the-loop y cómo mantener el control cuando la IA actúa por su cuenta.
area: gobernanza-y-control
related: [fundamentos, automatizacion-y-procesos, normativa-ia]
---

# Gobernanza y control de agentes de IA

## El problema del shadow AI

Shadow AI es el conjunto de agentes de IA que operan en una empresa sin que nadie los haya autorizado formalmente. Según el CSA (Cloud Security Alliance, abril 2026), el 82% de las empresas tiene agentes activos que nadie dio de alta. No son amenazas externas: son herramientas que los propios empleados adoptaron porque resuelven su trabajo, pero sin supervisión ni política.

El riesgo no es que la IA sea maliciosa: es que nadie sabe qué datos procesa, qué decisiones toma ni qué pasa cuando falla.

## Human-in-the-loop: cuándo es obligatorio

El principio de Ailitica: la IA propone, el humano decide. Esto no es filosófico, es operativo. Hay tres niveles:

1. **Siempre en el bucle**: el humano valida cada salida antes de que tenga efecto externo. Para decisiones de alto impacto o procesos nuevos sin histórico de fallos.
2. **En excepciones**: el agente actúa de forma autónoma en los casos claros y escala al humano cuando detecta ambigüedad. Para procesos maduros con tasa de error baja y conocida.
3. **Supervisión asíncrona**: el agente actúa, el humano revisa por muestreo. Para flujos de bajo riesgo y alto volumen con auditoría periódica.

El nivel correcto depende del impacto de un error, no del grado de confianza en la IA.

## Señales de que un agente está fuera de control

- Toma decisiones que nadie le encargó explícitamente.
- No hay registro de qué hizo, cuándo y con qué datos.
- El equipo que lo usa no sabe explicar cómo llega a sus resultados.
- Nadie puede revertir su última acción.

## Auditoría periódica: mínimos

Tres comprobaciones básicas para cualquier agente en producción:
1. ¿Hay log de cada acción con fecha, input y output?
2. ¿Hay un humano identificado responsable de sus decisiones?
3. ¿Hay un procedimiento definido para detenerlo en caso de fallo?

## Conceptos relacionados

- [Fundamentos](fundamentos.md): qué es un agente de IA
- [Normativa IA](normativa-ia.md): obligaciones legales de supervisión bajo el AI Act
- [Estrategia y decisión](estrategia-y-decision.md): cómo evaluar un agente antes de pasarlo a producción

## Artículos en profundidad

- [Agentes de IA que nadie autorizó: el problema del shadow AI](https://ailitica.com/blog/gobernanza-control-agentes-shadow-ai.html)
- [Señales de que tu agente de IA está fuera de control](https://ailitica.com/blog/senales-agente-ia-fuera-de-control.html)
- [Human-in-the-loop: cuándo aplicarlo y cuándo no](https://ailitica.com/blog/human-in-the-loop-cuando-aplicarlo.html)
- [Cómo controlar un agente de IA en tu empresa](https://ailitica.com/blog/como-controlar-agente-ia-empresa.html)
- [IA sin supervisión: el caso PocketOS](https://ailitica.com/blog/ia-sin-supervision-caso-pocketos.html)
- [Gobernanza de IA en la empresa pequeña](https://ailitica.com/blog/gobernanza-ia-empresa-pequena.html)

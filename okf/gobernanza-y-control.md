---
title: Gobernanza y control de agentes de IA
description: Preguntas frecuentes sobre shadow AI, supervisión de agentes, auditoría, human-in-the-loop y control en producción.
area: gobernanza-y-control
related: [fundamentos, automatizacion-y-procesos, normativa-ia]
---

# Gobernanza y control de agentes de IA

## ¿Qué es el shadow AI?

Shadow AI es el conjunto de agentes e IA que operan en una empresa sin que nadie los haya autorizado formalmente. Según el CSA (Cloud Security Alliance, abril 2026), el 82% de las empresas tiene agentes activos que nadie dio de alta. No son amenazas externas: son herramientas que los propios empleados adoptaron porque resuelven su trabajo, pero sin supervisión, sin política de datos y sin nadie responsable si algo falla.
→ [Agentes de IA que nadie autorizó: el problema del shadow AI](https://ailitica.com/blog/gobernanza-control-agentes-shadow-ai.html)
→ [Gobernanza de IA en la empresa pequeña](https://ailitica.com/blog/gobernanza-ia-empresa-pequena.html)

## ¿Cómo sé si mi agente de IA está actuando correctamente?

Tres comprobaciones mínimas para cualquier agente en producción: hay un log de cada acción con fecha, input y output; hay un humano identificado como responsable de sus decisiones; y hay un procedimiento definido para detenerlo si algo sale mal. Si falla cualquiera de los tres, el agente no tiene la supervisión mínima necesaria.
→ [Señales de que tu agente de IA está fuera de control](https://ailitica.com/blog/senales-agente-ia-fuera-de-control.html)
→ [Cómo controlar un agente de IA en tu empresa](https://ailitica.com/blog/como-controlar-agente-ia-empresa.html)

## ¿Qué es el human-in-the-loop y cuándo aplicarlo?

Human-in-the-loop es el principio de mantener a una persona en la cadena de decisión de un agente de IA. Hay tres niveles: el humano valida cada salida antes de que tenga efecto externo (para decisiones de alto impacto), el agente actúa en los casos claros y escala al humano en excepciones (para procesos maduros con tasa de error baja), o supervisión asíncrona por muestreo (para flujos de bajo riesgo y alto volumen). El nivel correcto depende del impacto de un error, no del grado de confianza en la IA.
→ [Human-in-the-loop: cuándo aplicarlo y cuándo no](https://ailitica.com/blog/human-in-the-loop-cuando-aplicarlo.html)

## ¿Qué pasa cuando un agente de IA comete un error?

El error de un agente de IA es recuperable si el sistema está bien diseñado: hay log de lo que hizo, hay un humano responsable y hay un procedimiento de reversión. El problema real no es que la IA falle (fallará), sino que no haya trazabilidad para saber qué falló, cuándo y con qué datos. Un agente sin log es un agente sin responsabilidad.
→ [IA sin supervisión: el caso PocketOS](https://ailitica.com/blog/ia-sin-supervision-caso-pocketos.html)
→ [Auditoría de agente de IA: lo que deberías revisar cada día](https://ailitica.com/blog/auditoria-agente-ia-cada-dia.html)

## ¿Cómo gestiono la IA que ya usan mis empleados sin que yo lo haya pedido?

El primer paso es visibilizar: hacer un inventario de qué herramientas de IA usa el equipo, para qué y con qué datos. El segundo es clasificar por riesgo: qué herramientas tocan datos de clientes o procesos críticos. El tercero es establecer una política mínima: qué está permitido, qué requiere aprobación y qué está prohibido. No se trata de prohibir sino de ordenar lo que ya existe.
→ [Agentes de IA que nadie autorizó: el problema del shadow AI](https://ailitica.com/blog/gobernanza-control-agentes-shadow-ai.html)
→ [Seis meses después: aprendizajes con agentes de IA](https://ailitica.com/blog/seis-meses-despues-aprendizajes-agentes-ia.html)

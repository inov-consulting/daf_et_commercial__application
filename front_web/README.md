# DAF & Commercial - Front Web

Base frontend Next.js pour l'application DAF & Commercial.

## Stack technique

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- ESLint
- App Router

## Structure

```txt
front_web/
├── src/
│   ├── app/          # Routes, layouts et pages Next.js
│   ├── components/   # Composants UI réutilisables
│   ├── config/       # Configuration applicative
│   ├── features/     # Modules fonctionnels métier
│   ├── lib/          # Fonctions utilitaires et clients techniques
│   ├── styles/       # Styles globaux
│   └── types/        # Types TypeScript partagés
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:3000`.

## Scripts

```bash
npm run dev          # Lance le serveur de développement
npm run build        # Génère le build de production
npm run start        # Lance le serveur de production
npm run lint         # Analyse ESLint
npm run type-check   # Vérifie les types TypeScript
```

## Variables d'environnement

Copier `.env.example` vers `.env.local` puis adapter les valeurs.

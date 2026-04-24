# Como Hacer un Repo Publico en GitHub

Este archivo explica paso a paso como cambiar un repositorio privado a publico para permitir la instalacion de skills.

## Metodo 1: Desde la Web de GitHub (Recomendado)

1. Ve a tu repositorio en GitHub
2. Haz clic en **Settings** (pestaña superior)
3. En el menu lateral izquierdo, haz clic en **General**
4. Baja hasta la seccion **Danger Zone** (zona peligrosa)
5. Busca **Change repository visibility**
6. Haz clic en **Change visibility**
7. Selecciona **Public**
8. Confirma escribiendo el nombre del repositorio
9. Haz clic en **I understand, change repository visibility**

## Metodo 2: Desde GitHub CLI (gh)

```bash
# Navega al repo (si no estas adentro)
cd ruta/del/repo

# Cambiar a publico
gh repo edit --visibility public

# O especificando el repo
gh repo edit OWNER/REPO --visibility public
```

## Metodo 3: Desde la API de GitHub

```bash
# Necesitas un token de GitHub con permisos repo
curl -X PATCH \
  -H "Authorization: token TU_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/OWNER/REPO \
  -d '{"visibility":"public"}'
```

## Consideraciones Importantes

### Antes de hacerlo publico:
- [ ] Elimina archivos `.env` o credenciales del historial de git
- [ ] Revisa que no haya API keys, tokens o contraseñas en el codigo
- [ ] Considera si el codigo contiene informacion sensible de negocio
- [ ] Revisa los issues y PRs por informacion privada

### Como eliminar credenciales del historial (si es necesario):
```bash
# Instala git-filter-repo
pip install git-filter-repo

# Elimina archivo del historial completo
git filter-repo --path archivo-secreto.env --invert-paths

# Fuerza push del historial limpio
git push origin --force --all
```

### Despues de hacerlo publico:
- [ ] Configura branch protection rules
- [ ] Habilita dependabot para alertas de seguridad
- [ ] Configura CODEOWNERS si hay multiples colaboradores
- [ ] Considera agregar un LICENSE file

## Verificar que quedo publico

```bash
# Desde la web:
# El repo deberia mostrar un icono de mundo (publico) en lugar de candado (privado)

# Desde CLI:
gh repo view OWNER/REPO --json visibility

# Deberia devolver: {"visibility":"public"}
```

## Instalar Skills una vez publico

```bash
# El comando que el agente usara:
npx skills add https://github.com/OWNER/REPO --skill NOMBRE-SKILL -y -g

# Ejemplo:
npx skills add https://github.com/supercent-io/skills-template --skill user-guide-writing -y -g
```

---

**Nota**: Si el repo no es tuyo y no tienes permisos de admin, no puedes cambiarlo. En ese caso, pide al owner que lo haga o crea un fork publico.

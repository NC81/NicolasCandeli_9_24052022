export default () => {
  return (`
  <label for="file" class="bold-label">Justificatif</label>
    <input required type="file" accept=".jpg, .jpeg, .png" class="form-control blue-border" data-testid="file" />
    <p class="error-file-message visible">
    Veuillez choisir une image (png/jpg/jpeg)
    </p>
  `)
}
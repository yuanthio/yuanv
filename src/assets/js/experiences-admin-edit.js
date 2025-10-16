const addDescription = document.getElementById('add-desc');
const descContainer = document.getElementById('desc-container');

addDescription.addEventListener('click', function() {
  const descItem = document.createElement('div');
  descItem.className = 'desc-item d-flex align-items-center mb-2';

  const input = document.createElement('input');
  input.type = 'text';
  input.name = 'descriptions[]';
  input.className = 'form-control me-2 input-description';
  input.placeholder = 'Write a description...';
  input.required = true;

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn btn-danger btn-sm btn-delete-desc';
  deleteBtn.innerHTML = '<i class="bi bi-trash-fill"></i>';

  descItem.appendChild(input);
  descItem.appendChild(deleteBtn);

  descContainer.appendChild(descItem);
});

document.addEventListener("DOMContentLoaded", function () {
  descContainer.addEventListener("click", function (e) {
    if (e.target.closest(".btn-delete-desc")) {
      const item = e.target.closest(".desc-item");
      if (item) item.remove();
    }
  });
});

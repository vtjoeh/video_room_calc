/*
RoomOS and Tesla browser have issues showing Select drop down menus. Create a dialog that allows for selection.


*/

const elements = document.querySelectorAll(".drpDown");

elements.forEach((element) => {
  element.addEventListener('click', () => {
    showRoleSelectionDialog(element);
  })
});


function closeDialogModals() {
  const dialogs = document.querySelectorAll('dialog');

  dialogs.forEach(dialog => {
    dialog.close();
  });
}

function showRoleSelectionDialog(element) {
  const dialogSelect = document.createElement('dialog');
  dialogSelect.classList.add('dialogWhiteBox')

  let dataDrpDownName = element.getAttribute('data-drpDownName');

  if (dataDrpDownName){
    dialogSelect.innerText = dataDrpDownName;
  }

  const innerDiv = document.createElement('div');

  dialogSelect.appendChild(innerDiv);

  const options = element.options;

  let optionsArray = Array.from(options);

  optionsArray.forEach(option => {

    const buttonDiv = document.createElement('div');
    const button = document.createElement('button');
    const buttonLabel = document.createElement('span');

    buttonLabel.innerText = option.text;


    if (option.text == '-') {
      buttonLabel.innerText = 'None Selected';
    }

    if (option.value === element.value) {
        buttonLabel.innerText = "✔️ " + buttonLabel.innerText
    }


    button.classList.add('roleSelectButton');

    button.value = option.value;

    button.appendChild(buttonLabel);

    innerDiv.appendChild(buttonDiv);
    buttonDiv.appendChild(button);

    button.onclick = () => {

      dialogSelect.remove()

      if (element.value != button.value) {
        element.value = button.value;

        let event = new Event('change');
        element.dispatchEvent(event);
      }

    }
  });


  document.body.appendChild(dialogSelect);
  dialogSelect.showModal();
}
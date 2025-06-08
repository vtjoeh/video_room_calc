

const elements = document.querySelectorAll(".drpDown");

elements.forEach((element) => {
  // Perform actions on each element
  console.log(element);
  element.addEventListener('click', () => {
    createDialogModal(element);
    console.log('elemnt clicked', element);

  })
});


function closeDialogModals() {
  const dialogs = document.querySelectorAll('dialog');

  dialogs.forEach(dialog => {
    dialog.close();
  });
}

function createDialogModal(element) {

  const dialogSelect = document.createElement('dialog');
  dialogSelect.style.padding = '10px';
  dialogSelect.style.width = 'fit-content';
  dialogSelect.style.minWidth = '100px';
  dialogSelect.style.borderRadius = '10px';
  dialogSelect.innerText = 'Select: '
  dialogSelect.id = 'drpDownOverride';
  dialogSelect.className = 'room';

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




    button.style.width = '250px';
    button.style.margin = '5px';
    button.value = option.value;
    // button.className = '';
    console.log('line 35')
    button.appendChild(buttonLabel);

    innerDiv.appendChild(buttonDiv);
    buttonDiv.appendChild(button);

    button.onclick = () => {

      dialogSelect.remove()

      if (element.value != button.value) {
        element.value = button.value;
        element.onchange();
      }

    }
  });


  document.body.appendChild(dialogSelect);
  dialogSelect.showModal();
  console.log('line 40')
}
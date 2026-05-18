function addletterer() {
    var letter = document.getElementById("boxingi");
    letter.value += event.currentTarget.value;
}

function solve() {
    var letter = document.getElementById("boxingi");
    letter.value = eval(letter.value);
}

function clearing() {
    document.getElementById("boxingi").value = "";
}
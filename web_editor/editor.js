var application = {
    currentDocument: null,
    vspaceClasses: {
        'gedicht-start': 'red', 'strophe-start': 'blue'
    },
    lineClasses: {
        'vers': 'darkblue',
        'titel': 'darkred',
        'autor': 'darkcyan',
        'kopfzeile': 'darkorange',
        'fusszeile': 'darkorange'
    },
    classAttribute: 'classes'
};

application.setDocument = function(doc) {
    this.currentDocument = doc;

    const pagesCount = doc.querySelectorAll('PageBreak').length;
    document.getElementById('pageselect').innerHTML 
        = [...Array(pagesCount).keys()].map(x => `<option>${x + 1}</option>`).join('');
    this.setPage(1);
}

application.getElementsOfPage = function(n) {
    const elements = this.currentDocument.querySelectorAll('Document > *');

    var out = [];

    for (var i = 0; i < elements.length; i++) {
        if (elements[i].matches('PageBreak'))  {
            n--;
            continue;
        }

        if (n == 0) {
            out.push(elements[i]);
        } else if (n < 0) {
            break;
        }
    }

    return out;
}

application.setPage = function(n) {
    var that = this;
    const pagesCount = this.currentDocument.querySelectorAll('PageBreak').length;

    if (n < 1) {
        this.setPage(1);
        return;
    }
    if (n > pagesCount) {
        this.setPage(pagesCount);
        return;
    }

    [...document.querySelectorAll('#pageselect option').values()]
        .forEach(y => {
           if (parseInt(y.innerText) == n) {
               y.setAttribute('selected', 'selected');
           } else {
               y.removeAttribute('selected');
           }
        });
    document.getElementById('pageselect').value = n;

    const elements = this.getElementsOfPage(n);
    application.setForm(elements);

    const imagestr = this.currentDocument.querySelectorAll('PageBreak')[n-1].attributes.filename.value;
    this.imageEl = new Image();
    const imageFile = [...document.getElementById('imagedir').files]
        .find(x => x.name == imagestr);

    if (imageFile) {
        this.imageEl.onload = function() {
            that.drawPage(elements);
        };
        this.imageEl.src = URL.createObjectURL(imageFile);
    } else {
        this.imageEl = undefined;
        this.drawPage(elements);
    }
}

application.setForm = function(elements) {
    var that = this;
    function selectFormEl(x) {
        const ann = x.querySelector(`Annotations > Annotation[${that.classAttribute}]`);
        
        var current = undefined;
        if (ann) {
            current = ann.attributes.value.value;
        }

        if (x.matches('VerticalSpace')) {
            const defaults = ['-'].concat(Object.keys(that.vspaceClasses));
            const selectEl = document.createElement('select');
            selectEl.innerHTML = defaults.map(x => `<option>${x}</option>`).join('');

            if (current) {
                [...selectEl.querySelectorAll('option').values()].find(y => y.innerText == current).setAttribute('selected', 'selected');
            }

            return selectEl;
        } else if (x.matches('TextLine')) {
            const defaults = ['-'].concat(Object.keys(that.lineClasses));
            const selectEl = document.createElement('select');
            selectEl.innerHTML = defaults.map(x => `<option>${x}</option>`).join('');

            if (current) {
                [...selectEl.querySelectorAll('option').values()].find(y => y.innerText == current).setAttribute('selected', 'selected');
            }

            return selectEl;
        } else {
            return null;
            //return '<input type="text"></input>';
        }
    }

    const newTableHTML = elements.map(x => {
        const form = selectFormEl(x).outerHTML;

        // TODO attach ID
        if (x.matches('VerticalSpace')) {
            return `<tr class="vspace"><td>[VSpace]</td><td>${form}</td></tr>`;
        } else if (x.matches('TextLine')) {
            var line = x.querySelector('TextEquiv').textContent;
            line = line == '' ? '[Leerzeile]' : line;

            return `<tr class="textline"><td>${line}</td><td>${form}</td></tr>`;
        } else {
            const name = x.nodeName;
            return `<tr class="other"><td>[${name}]</td></tr>`;
        }
    }).reduce((a, b) => a + b, '');

    document.querySelector('.items-table tbody').innerHTML = newTableHTML;
    document.querySelectorAll('.items-table select').forEach(el => that.updateClass(el));

    document.querySelectorAll('.items-table select').forEach(el => el.addEventListener('change', () => {
        that.updateClass(el);
        that.drawPage(elements);
    }));

    document.querySelectorAll('.items-table select').forEach(el => el.addEventListener('focus', () => {
        that.drawPage(elements);
    }));
}

application.drawPage = function(elements) {
    // TODO click handler?

    const canvas = document.getElementById('image-canvas');

    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);


    const imageEl = this.imageEl;
    var scale = Math.min(canvas.width / imageEl.width, 
        canvas.height / imageEl.height);
    ctx.scale(scale, scale);
    ctx.drawImage(imageEl, 0, 0);

    elements.forEach(x => drawElem(x, ctx));

    function drawElem(e, ctx) {
        if (e.matches('TextLine')) {
            const coordStr = e.querySelector('Annotation[key="pos"]').attributes.value.value;
            const nums = coordStr.split(/[, ]/).map(x => parseInt(x));

            ctx.strokeStyle = '#008800';
            ctx.lineWidth = 1;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.strokeRect(nums[0], nums[1], nums[2]-nums[0], nums[3]-nums[1]);
            ctx.fillRect(nums[0], nums[1], nums[2]-nums[0], nums[3]-nums[1]);
        } else if (e.matches('VerticalSpace')) {
            const coordStr = e.querySelector('Annotation[key="pos"]').attributes.value.value;
            const nums = coordStr.split(/[, ]/).map(x => parseInt(x));

            ctx.strokeStyle = '#ee0000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nums[0], nums[1]);
            ctx.lineTo(nums[2], nums[3]);
            ctx.stroke();
        }
    }
}

application.updateClass = function(el) {
    const val = el.value;
    var color = undefined;
    if (val == '-') {
        el.closest('tr').style = '';
    } else {
        color = color || this.vspaceClasses[val];
        color = color || this.lineClasses[val];

        el.closest('tr').style = `color: ${color}`;
    }

    // TODO Add to XML
}



document.getElementById('xmlinput').addEventListener('change', function() {
    const parser = new DOMParser();
    const reader = new FileReader();
    reader.onload = function(e) {
        const xmlDoc = parser.parseFromString(reader.result, 'text/xml');
        application.setDocument(xmlDoc);
    }

    if (this.files.length > 0) {
        reader.readAsText(this.files[0]);
    }
});

document.getElementById('prevpage').addEventListener('click', function() {
    const page = parseInt(document.getElementById('pageselect').value);
    application.setPage(page - 1);
});

document.getElementById('nextpage').addEventListener('click', function() {
    const page = parseInt(document.getElementById('pageselect').value);
    application.setPage(page + 1);
});

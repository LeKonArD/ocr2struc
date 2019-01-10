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
        const ann = x.querySelector(`Annotations > Annotation[key="${that.classAttribute}"]`);
        
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

        const xmlid = x.querySelector('Annotation[key="id"]').attributes.value.value;
        if (x.matches('VerticalSpace')) {
            return `<tr class="vspace" data-xml-id="${xmlid}"><td>[VSpace]</td><td>${form}</td></tr>`;
        } else if (x.matches('TextLine')) {
            var line = x.querySelector('TextEquiv').textContent;
            line = line == '' ? '[Leerzeile]' : line;

            return `<tr class="textline" data-xml-id="${xmlid}"><td>${line}</td><td>${form}</td></tr>`;
        } else {
            const name = x.nodeName;
            return `<tr class="other" data-xml-id="${xmlid}"><td>[${name}]</td></tr>`;
        }
    }).join('');

    document.querySelector('.items-table tbody').innerHTML = newTableHTML;
    document.querySelectorAll('.items-table select').forEach(el => that.updateClass(el));

    document.querySelectorAll('.items-table select').forEach(el => el.addEventListener('change', () => {
        that.updateClass(el);
        that.drawPage(elements, el.closest('tr').attributes['data-xml-id'].value);
    }));

    document.querySelectorAll('.items-table select').forEach(el => el.addEventListener('focus', () => {
        that.drawPage(elements, el.closest('tr').attributes['data-xml-id'].value);
    }));
}

application.drawPage = function(elements, selectedId) {
    var that = this;
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
        const idStr = e.querySelector('Annotation[key="id"]').attributes.value.value;
        const selected = idStr == selectedId;

        var classStr;
        if (e.querySelector(`Annotation[key="${that.classAttribute}"]`)) {
            classStr = e.querySelector(`Annotation[key="${that.classAttribute}"]`).attributes.value.value;
        }

        if (e.matches('TextLine')) {
            const coordStr = e.querySelector('Annotation[key="pos"]').attributes.value.value;
            const nums = coordStr.split(/[, ]/).map(x => parseInt(x));

            if (!selected) {
                ctx.strokeStyle = '#008800';
                ctx.lineWidth = 1;
                ctx.globalAlpha = classStr ? .2 : .01;
                ctx.fillStyle = classStr ? that.lineClasses[classStr] : '#000000';
            } else {
                ctx.strokeStyle = '#008800';
                ctx.lineWidth = 2;
                ctx.globalAlpha = classStr ? .4 : .10;
                ctx.fillStyle = classStr ? that.lineClasses[classStr] : '#000000';
            }
            ctx.fillRect(nums[0], nums[1], nums[2]-nums[0], nums[3]-nums[1]);
            ctx.globalAlpha = 1;
            ctx.strokeRect(nums[0], nums[1], nums[2]-nums[0], nums[3]-nums[1]);
        } else if (e.matches('VerticalSpace')) {
            const coordStr = e.querySelector('Annotation[key="pos"]').attributes.value.value;
            const nums = coordStr.split(/[, ]/).map(x => parseInt(x));

            if (!selected) {
                ctx.strokeStyle = '#ee4444';
                ctx.lineWidth = 1;
            } else {
                ctx.strokeStyle = '#ee0000';
                ctx.lineWidth = 2;
            }
            ctx.beginPath();
            ctx.moveTo(nums[0], nums[1]);
            ctx.lineTo(nums[2], nums[3]);
            ctx.stroke();

            if (classStr) {
                ctx.fillStyle = that.vspaceClasses[classStr];
                ctx.beginPath();
                ctx.moveTo(nums[2], nums[3]);
                ctx.lineTo(nums[2] - 20, nums[3] - 10);
                ctx.lineTo(nums[2] - 20, nums[3] + 10);
                ctx.closePath();
                ctx.fill();

            }
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
    const id = el.closest('tr').attributes['data-xml-id'].value;
    const xmlEl = this.currentDocument.querySelector(`Annotation[key="id"][value="${id}"]`).parentElement.parentElement;
    const classStr = val == '-' ? '' : val;


    var classAnnotation = xmlEl.querySelector(`Annotations > Annotation[key="${this.classAttribute}"]`);
    if (!classAnnotation && classStr) {
        classAnnotation = new DOMParser().parseFromString('<Annotation />', 'application/xml').children[0];
        classAnnotation.setAttribute('key', this.classAttribute);
        xmlEl.querySelector('Annotations').appendChild(classAnnotation);
    }

    if (classAnnotation) classAnnotation.setAttribute('value', classStr);
}

application.saveFile = function(filename) {
    const serializer = new XMLSerializer();
    var sXML = serializer.serializeToString(this.currentDocument);

    function download(filename, text) {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

    download(filename, sXML);
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

document.getElementById('imagedir').addEventListener('change', function() {
    const page = parseInt(document.getElementById('pageselect').value);
    application.setPage(page);
});

document.getElementById('prevpage').addEventListener('click', function() {
    const page = parseInt(document.getElementById('pageselect').value);
    application.setPage(page - 1);
});

document.getElementById('nextpage').addEventListener('click', function() {
    const page = parseInt(document.getElementById('pageselect').value);
    application.setPage(page + 1);
});

document.getElementById('save').addEventListener('click', function() {
    var file = document.getElementById('xmlinput').files[0];
    application.saveFile(file.name);
});

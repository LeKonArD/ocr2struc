from lxml import etree

class Page:

    def __init__(self, filename, width, height):
        self.filename = filename
        self.width = width
        self.height = height

class LayoutElement:

    def __init__(self):
        self.annotations = {}

    def toelem(self):
        raise NotImplementedError('Unterklassen müssen toelem() implementieren')

    def annotationstoelem(self):
        root = etree.Element("Annotations")
        for key, val in self.annotations.items():
            att = etree.SubElement(root, "Annotation", attrib={ "key": str(key), "value": str(val)})

        return root

class TextLine(LayoutElement):

    def __init__(self, text, page, ax, ay, bx, by):
        super().__init__()
        self.ax = ax
        self.ay = ay
        self.bx = bx
        self.by = by
        self.text = text
        self.page = page
        self.annotations = { "pos": "%d,%d %d,%d" % (self.ax, self.ay, self.bx, self.by) }

    def __str__(self):
        return "<Line at (%f, %f) (%f, %f)>" % (self.ax, self.ay, self.bx, self.by)

    def linewidth(self):
        return self.bx - self.ax

    def leftmargin(self):
        return self.ax

    def rightmargin(self):
        return self.page.width - self.ax

    def lineheight(self):
        return self.by - self.ay

    def toelem(self):
        root = etree.Element("TextLine")
        root.append(self.annotationstoelem())
        etree.SubElement(root, "TextEquiv").text = self.text
        root.set("linewidth", str(self.linewidth()))
        root.set("lineheight", str(self.lineheight()))
        root.set("leftmargin", str(self.leftmargin()))
        root.set("rightmargin", str(self.rightmargin()))
        return root

class PageBreak(LayoutElement):

    def __init__(self, nextPage):
        super().__init__()
        self.nextPage = nextPage

    def __str__(self):
        return "<Page break to page %d>" % (self.nextPage.filename)

    def toelem(self):
        root = etree.Element("PageBreak")
        root.append(self.annotationstoelem())
        root.set("filename", str(self.nextPage.filename))
        root.set("width", str(self.nextPage.width))
        root.set("height", str(self.nextPage.height))
        return root

class VerticalSpace(LayoutElement):
    
    def __init__(self, offset, page):
        super().__init__()
        self.offset = offset
        self.page = page

    def __str__(self):
        return "<Vertical space of %d>" % (self.offset)

    def toelem(self):
        root = etree.Element("VerticalSpace")
        root.append(self.annotationstoelem())
        root.set("offset", str(self.offset))
        return root

from lxml import etree
import re

def parse_file(file):
    print("Parsing file %s" % file)
    tree = _strip_ns_prefix(etree.parse(file))

    filename = tree.xpath("//Page/@imageFilename")[0]
    pagenum = int(re.match("([0-9]+)\.png", filename).group(1))

    def parse_line(el):
        text = el.xpath(".//Unicode/text()")
        text = text[0] if len(text) else None
        coordsStr = el.xpath(".//Coords/@points")[0]

        coords = list(map(lambda x: int(x), re.findall("[0-9]+", coordsStr)))
        return TextLine(text, pagenum, coords[0], coords[1], coords[4], coords[5])

    lines = list(map(parse_line, tree.xpath("//TextLine")))
    return lines
    

# https://stackoverflow.com/a/30233635
def _strip_ns_prefix(tree):
    #xpath query for selecting all element nodes in namespace
    query = "descendant-or-self::*[namespace-uri()!='']"
    #for each element returned by the above xpath query...
    for element in tree.xpath(query):
        #replace element name with its local name
        element.tag = etree.QName(element).localname
    return tree


class TextLine:

    attributes = {}

    def __init__(self, text, pagenum, ax, ay, bx, by):
        self.ax = ax
        self.ay = ay
        self.bx = bx
        self.by = by
        self.text = text
        self.pagenum = pagenum

    def __str__(self):
        return "Line at (%f, %f) (%f, %f) on page %d" % (self.ax, self.ay, self.bx, self.by, self.pagenum)

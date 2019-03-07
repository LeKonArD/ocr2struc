from lxml import etree

from more_itertools import *


class TeiWriter:

    def __init__(self):
        self.root = etree.Element('teiCorpus')
        self.root.attrib['xmlns'] = "http://www.tei-c.org/ns/1.0"

        self.current_title = None
        self.current_author = None
        self.current_poem = None
        self.current_stanza = None

    def close_poem(self):
        if self.current_poem is None:
            return

        # enthält das aktuelle Gedicht keine Zeilen, wird es nicht ausgegeben
        if len(self.current_poem.xpath('.//l')) == 0:
            return

        tei_el = etree.SubElement(self.root, 'TEI')
        title_stmt = etree.SubElement(etree.SubElement(etree.SubElement(
            tei_el, 'teiHeader'), 'fileDesc'), 'titleStmt')
        etree.SubElement(title_stmt, 'title').text = self.current_title
        etree.SubElement(title_stmt, 'author').text = self.current_author

        body = etree.SubElement(etree.SubElement(tei_el, 'text'), 'body')
        body.append(self.current_poem)
        self.current_poem = None

    def open_poem(self):
        self.current_title = None
        self.current_author = None
        self.current_stanza = None
        self.current_poem = etree.Element('div')
        self.current_poem.attrib['type'] = 'poem'

        if self.postponed_pagebreak:
            self.add_pb()
            self.postponed_pagebreak = False

    def close_stanza(self):
        if self.current_stanza is None:
            return

        self.current_poem.append(self.current_stanza)
        self.current_stanza = None

    def open_stanza(self):
        self.current_stanza = etree.Element('lg')

    def add_line(self, text):
        etree.SubElement(self.current_stanza, 'l').text = text

    def add_header(self, text):
        head = etree.SubElement(self.current_poem, 'head')
        head.text = text
        head.attrib['type'] = 'head'

    def add_byline(self, text):
        byline = etree.Element('byline')
        byline.text = text
        self.current_poem.append(byline)

    def add_pb(self):
        if self.current_poem is not None:
            if self.current_stanza is not None:
                etree.SubElement(self.current_stanza, 'pb')
            else:
                etree.SubElement(self.current_poem, 'pb')
        else:
            self.postponed_pagebreak = True

    def process(self, elements):
        p = _process_ignored(map(_map_el, elements))

        for (tagname, classes, text) in p:
            self.process_element(tagname, classes, text)

        # schließe noch offene Elemente
        self.close_stanza()
        self.close_poem()

    def process_element(self, tagname, classes, text):
        if 'gedicht-start' in classes:
            self.close_stanza()
            self.close_poem()
            self.open_poem()

        if 'titel' in classes:
            self.current_title = text
            self.close_stanza()
            self.add_header(text)

        if 'autor' in classes:
            self.current_author = text
            self.close_stanza()
            self.add_byline(text)

        if 'strophe-start' in classes:
            self.close_stanza()
            self.open_stanza()

        if 'vers' in classes:
            self.add_line(text)

        if tagname == 'PageBreak':
            self.add_pb() # TODO page number, facsimile/png


# Ordnet jedem Element im XML-Dokument ein 3-Tupel zu: Tagname, Klassen, Text
def _map_el(el):
    tagname = el.tag
    attributes = dict(map(lambda a: (a.attrib['key'], a.attrib['value']), el.xpath('.//Annotation')))
    if 'classes' in attributes:
        classes = attributes['classes'].split(' ')
    else:
        classes = []

    if el.xpath('./TextEquiv'):
        text = el.xpath('./TextEquiv')[0].text
    else:
        text = None

    return tagname, classes, text


# Verändert den Eingabeiterator so, dass 'ignore'-Abstände zwei Elemente
# mit gleichen Klassen zusammenführt.
def _process_ignored(it):
    it = peekable(it)
    try:
        while True:
            (tagname, classes, text) = next(it)

            while True:
                try:
                    n, c, t = it.peek()
                    if (n == tagname and c == classes) or ('ignore' in c):
                        next(it)
                        if t != None: text = text + ' ' + t
                    else:
                        break
                except StopIteration:
                    break

            yield (tagname, classes, text)
    except StopIteration:
        pass

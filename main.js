/****
    COPY RIGHT AL KASIH 
****/

    'use strict';
    const args = process.argv;
    //var pduSend = process.argv[2];
    var pduSend = process.argv.slice(2)[0];
    //console.log('myArgs: ', myArgs[0]);
    //return; 

    var wapTokens = {

        type: function( octet ) {
            if (octet == 6) {
                return 'Push';
            }
            return 'unknown';
        },
        WSP: function( octets ) {
            var i,
                o,
                text = '',
                headers = [],
                header = {},
                wellKnown;

            while (octets.length) {
                o = parseInt( octets.shift(), 16 );

                if (o === 0 && header.octets) {
                    header.pos++;
                }

                if (o > 0 && o < 32) { // start of next header
                    if (header.octets) { // there is an unfinished header left -> this indicates a illegal WSP header
                        headers.push( header );
                    }

                    header = {
                        key: '',
                        value: '',
                        pos: 0,
                        octets: o // the next 0 - 30 octets are the data
                    };

                    if (o === 31) { // special case: length is in next octet
                        header.octets = parseInt( octets.shift(), 16 );
                    }

                    if (headers.length === 0) {
                        header.key = 'Content-Type'; // first WSP header has to be content type
                    }
                }
                else if (o > 31 && o < 128) { // this is a character
                    header.value += String.fromCharCode( o );
                    header.pos++;
                }
                else if (o > 127) {
                    wellKnown = o & 0x7f;

                    if (wellKnown === 0x01) {
                        header.value += '; charset=';
                    }
                    else if (wellKnown === 0x30) {
                        header.value += 'application/vnd.wap.slc';
                    }
                    else if (wellKnown === 0x2e) {
                        header.value += 'application/vnd.wap.sic';
                    }
                    else if (wellKnown === 0x6A) {
                        header.value += 'UTF-8';
                    }

                    header.pos++;
                }

                if (header.pos >= header.octets) {
                    headers.push( header );
                    header = {
                        key: '',
                        value: '',
                        pos: 0,
                        octets: 0
                    };
                }
            }

            for (i = 0; i < headers.length; i++) {
                text += headers[ i ].key + ': ' + headers[ i ].value;
            }

            return text;
        },

        WBXML: function( octets ) {
            var i,
                text = '';

            for (i = 0; i < octets.length; ++i) {
                text += octets[ i ];
            }

            $.ajax( {
                async: false,
                cache: false,
                data: {octets: text},
                timeout: 1000,
                url: 'wbxml.pl',
                success: function( xml ) {
                    text = xml.replace( /</g, '&lt;' ).replace( />/g, '&gt;' ).replace( /&/g, '&amp;' );
                }
            } );

            if (!text.match( /&/ )) {
                text += ' (Could not be decoded, try ASCII decoding)';

                while (octets.length) {
                    text += String.fromCharCode( parseInt( octets.shift(), 16 ) );
                }
            }

            return text;
        }

    };

    var gsm7bit = {
        0: '@', 1: '£', 2: '$', 3: '¥', 4: 'è', 5: 'é', 6: 'ù', 7: 'ì', 8: 'ò', 9: 'Ç',
        10:'\n', 11: 'Ø', 12: 'ø', 13: '\r', 14: 'Å', 15: 'å', 16: '\u0394', 17: '_', 18: '\u03a6', 19: '\u0393',
        20: '\u039b', 21: '\u03a9', 22: '\u03a0', 23: '\u03a8', 24: '\u03a3', 25: '\u0398', 26: '\u039e', 28: 'Æ', 29: 'æ',
        30: 'ß', 31: 'É', 32: ' ', 33: '!', 34: '"', 35: '#', 36: '¤', 37: '%', 38: '&', 39: '\'',
        40: '(', 41: ')', 42: '*', 43: '+', 44: ',', 45: '-', 46: '.', 47: '/', 48: '0', 49: '1',
        50: '2', 51: '3', 52: '4', 53: '5', 54: '6', 55: '7', 56: '8', 57: '9', 58: ':', 59: ';',
        60: '<', 61: '=', 62: '>', 63: '?', 64: '¡', 65: 'A', 66: 'B', 67: 'C', 68: 'D', 69: 'E',
        70: 'F', 71: 'G', 72: 'H', 73: 'I', 74: 'J', 75: 'K', 76: 'L', 77: 'M', 78: 'N', 79: 'O',
        80: 'P', 81: 'Q', 82: 'R', 83: 'S', 84: 'T', 85: 'U', 86: 'V', 87: 'W', 88: 'X', 89: 'Y',
        90: 'Z', 91: 'Ä', 92: 'Ö', 93: 'Ñ', 94: 'Ü', 95: '§', 96: '¿', 97: 'a', 98: 'b', 99: 'c',
        100: 'd', 101: 'e', 102: 'f', 103: 'g', 104: 'h', 105: 'i', 106: 'j', 107: 'k', 108: 'l', 109: 'm',
        110: 'n', 111: 'o', 112: 'p', 113: 'q', 114: 'r', 115: 's', 116: 't', 117: 'u', 118: 'v', 119: 'w',
        120: 'x', 121: 'y', 122: 'z', 123: 'ä', 124: 'ö', 125: 'ñ', 126: 'ü', 127: 'à',
        27: {
            10: '\n', // Should be FORM-FEED but no good here
            20: '^', 40: '{', 41: '}', 47: '\\',
            60: '[', 61: '~', 62: ']', 64: '|', 101: '&#8364;'
        }
    };

    var tokens = {
        Number: function( octets, length, addressType ) {
            var i,
                number = '';

            if (addressType && addressType.ToN === 0x50) {
                number = decode7Bit( octets );
            } else {
                for (i = 0; i < octets.length; ++i) {
                    number += reverse( octets[ i ] );
                }

                if (number.match( /\D$/ ) || (length && number.length > length)) {
                    var paddingEx = /(.)$/;
                    var result = paddingEx.exec( number );

                    number = number.substring( 0, number.length - 1 );

                    if (result && result[1] && result[1] !== 'F') {
                        number += '(VIOLATION!)';
                    }
                }
            }

            return number;
        },

        ToA: function( octet ) {
            var type = parseInt( octet, 16 );
            var ToN = type & 0x70;
            var NPI = type & 0xF;            
            var text = '';
            if (ToN === 0) {
                text += 'Unknown type of address';
            }
            else if (ToN === 0x10) {
                text += 'International number';
            }
            else if (ToN === 0x20) {
                text += 'National number';
            }
            else if (ToN === 0x30) {
                text += 'Network specific number';
            }
            else if (ToN === 0x40) {
                text += 'Subscriber number';
            }
            else if (ToN === 0x50) {
                text += 'Alphanumeric, (coded according to GSM TS 03.38 7-bit default alphabet)';
            }
            else if (ToN === 0x60) {
                text += 'Abbreviated number';
            }
            else if (ToN === 0x70) {
                text += 'Reserved for extension';
            }
            else {
                text += 'Reserved type of address';
            }

            text += ', ';

            if (NPI === 0) {
                text += 'Unknown';
            }
            else if (NPI === 1) {
                text += 'ISDN/telephone numbering plan (E.164/E.163)';
            }
            else if (NPI === 3) {
                text += 'IData numbering plan (X.121)';
            }
            else if (NPI === 4) {
                text += 'Telex numbering plan';
            }
            else if (NPI === 8) {
                text += 'National numbering plan';
            }
            else if (NPI === 9) {
                text += 'Private numbering plan';
            }
            else if (NPI === 0xA) {
                text += 'ERMES numbering plan (ETSI DE/PS 3 01-3)';
            }
            else if (NPI === 0xF) {
                text += 'Reserved for extension';
            }
            else {
                text += 'Reserved numbering plan';
            }

            if ((type & 0x80) === 0) {
                text += ' (VIOLATION: Highest bit should always be set!)';
            }

            return {
                ToN: ToN,
                NPI: NPI,
                info: text
            };
        },

        ToM: function( octet ) {
            var o = parseInt( octet, 16 );
            var TP_MTI_mask = 0x1; //0x3;
            var text = '';
            var flags = [];
            var deliver = false;
            var submit =false;
            var TP_VPF = null;
            var TP_UDHI = false;

            if ((o & TP_MTI_mask) === 0) {
                text += 'SMS-DELIVER';
                deliver = true;
            }
            else if ((o & TP_MTI_mask) === 1) {
                text += 'SMS-SUBMIT';
                submit = true;
            }
            else {
                console.debug( o, padwZeros( o.toString( 2 ) ) );
            }

            if (o & 0x80) {
                flags.push( 'TP-RP (Reply path exists)' );
            }
            if (o & 0x40) {
                TP_UDHI = true;
                flags.push( 'TP-UDHI (User data header indicator)' );
            }

            if (submit) {
                if (o & 0x20) {
                    flags.push( 'TP-SRR (Status report request)' );
                }

                var TP_VPF_mask = o & 0x18;
                var vpfText = 'TP-VPF (Validity Period Format): ';

                if (TP_VPF_mask === 0) {
                    // do nothing
                }
                else if (TP_VPF_mask === 8) {
                    TP_VPF = 'enhanced';
                    flags.push( vpfText + 'enhanced format' );
                }
                else if (TP_VPF_mask === 0x10) {
                    TP_VPF = 'relative';
                    flags.push( vpfText + 'relative format' );
                }
                else if (TP_VPF_mask === 0x18) {
                    TP_VPF = 'absolute';
                    flags.push( vpfText + 'absolute format' );
                }

                if ((o & 0x4) === 0) {
                    flags.push( 'TP-RD (Reject duplicates)' );
                }
            }
            else if (deliver) {
                if (o & 0x20) {
                    flags.push( 'TP-SRI (Status report indication)' );
                }
                if ((o & 0x4) === 0) {
                    flags.push( 'TP-MMS (More messages to send)' );
                }
            }
            if (flags.length) {
                text += ', Flags: ' + flags.join( ', ' );
            }
            return {
                type: deliver ? 'deliver' : (submit ? 'submit' : ''),
                TP_UDHI: TP_UDHI,
                TP_VPF: TP_VPF,
                info: text
            };
        },

        PID: function( octet ) {
            var o = parseInt( octet, 16 );
            var text = '';
            var type = o & 0xC0;

            if (type === 0) {
                var firstFive = o & 0x1F;
                if (o & 0x20) {
                    text += 'Telematic interworking (Type: ';
                    if (firstFive === 0) {
                        text += 'implicit';
                    }
                    else if (firstFive === 1) {
                        text += 'telex';
                    }
                    else if (firstFive === 2) {
                        text += 'group 3 telefax';
                    }
                    else if (firstFive === 3) {
                        text += 'group 4 telefax';
                    }
                    else if (firstFive === 4) {
                        text += 'voice telephone - speech conversion';
                    }
                    else if (firstFive === 5) {
                        text += 'ERMES - European Radio Messaging System';
                    }
                    else if (firstFive === 6) {
                        text += 'National Paging System';
                    }
                    else if (firstFive === 7) {
                        text += 'Videotex - T.100/T.101';
                    }
                    else if (firstFive === 8) {
                        text += 'teletex, carrier unspecified';
                    }
                    else if (firstFive === 9) {
                        text += 'teletex, in PSPDN';
                    }
                    else if (firstFive === 0xA) {
                        text += 'teletex, in CSPDN';
                    }
                    else if (firstFive === 0xB) {
                        text += 'teletex, in analog PSTN';
                    }
                    else if (firstFive === 0xC) {
                        text += 'teletex, in digital ISDN';
                    }
                    else if (firstFive === 0xD) {
                        text += 'UCI - Universal Computer Interface, ETSI DE/PS 3 01-3';
                    }
                    else if (firstFive === 0x10) {
                        text += 'message handling facility known to the SC';
                    }
                    else if (firstFive === 0x11) {
                        text += 'public X.400-based message handling system';
                    }
                    else if (firstFive === 0x12) {
                        text += 'Internet E-Mail';
                    }
                    else if (firstFive >= 0x18 && firstFive <= 0x1E) {
                        text += 'SC specific value';
                    }
                    else if (firstFive === 0x1F) {
                        text += 'GSM mobile station';
                    }
                    else {
                        text += 'reserved';
                    }

                    text += ')';
                }
                else {
                    text += 'SME-to-SME protocol';
                    if (firstFive > 0) {
                        text += ' (Unknown bitmask: ' + firstFive.toString( 2 ) + '- in case of SMS-DELIVER these indicate the SM-AL protocol being used between the SME and the MS!)';
                    }
                }
            }
            else if (type === 0x40) {
                var firstSix = o & 0x3F;

                if (firstSix >= 0 && firstSix <= 7) {
                    text += 'Short Message Type ' + firstSix;
                }
                else if (firstSix === 0x1F) {
                    text += 'Return Call Message';
                }
                else if (firstSix === 0x3D) {
                    text += 'ME Data download';
                }
                else if (firstSix === 0x3E) {
                    text += 'ME De-personalization Short Message';
                }
                else if (firstSix === 0x3F) {
                    text += 'SIM Data download';
                }
                else {
                    text += 'reserved';
                }
            }
            else if (type === 0x80) {
                text += 'reserved';
            }
            else if (type === 0xC0) {
                text += 'SC specific use';
            }
            return text;
        },

        DCS: function( octet ) {
            var o = parseInt( octet, 16 );
            var text = '';
            var alphabet = 'default';
            var codingGroup = o & 0xF0;

            if (codingGroup >= 0 && codingGroup <= 0x30) {
                text += 'General Data Coding groups, ';

                if (o & 0x20) {
                    text += 'compressed';
                }
                else {
                    text += 'uncompressed';
                }

                text += ', ';
                var alphabetFlag = o & 0xC;

                if (alphabetFlag === 0) {
                    text += 'default alphabet';
                }
                else if (alphabetFlag === 4) {
                    text += '8 bit data';
                    alphabet = '8bit';
                }
                else if (alphabetFlag === 8) {
                    text += 'UCS2 (16 bit)';
                    alphabet = 'ucs2';
                }
                else if (alphabetFlag === 0xC) {
                    text += 'reserved alphabet';
                }
            }
            else if (codingGroup >= 0x40 && codingGroup <= 0xB0) {
                text += 'Reserved coding groups';
            }
            else if (codingGroup === 0xC0) {
                text += 'Message Waiting Indication Group: Discard Message, ';
            }
            else if (codingGroup === 0xD0) {
                text += 'Message Waiting Indication Group: Store Message, standard encoding, ';
            }
            else if (codingGroup === 0xE0) {
                text += 'Message Waiting Indication Group: Store Message, UCS2 encoding, ';
            }
            else if (codingGroup === 0xF0) {
                text += 'Data coding/message class, ';

                if (o & 8) {
                    text += '(VIOLATION: reserved bit set, but should not!), ';
                }

                if (o & 4) {
                    text += '8 bit data';
                    alphabet = '8bit';
                }
                else {
                    text += 'Default alphabet';
                }
            }

            if ((codingGroup >= 0 && codingGroup <= 0x30) || codingGroup === 0xF0) {
                text += ', ';

                if ((codingGroup >= 0 && codingGroup <= 0x30) && (o & 0x10) === 0) {
                    text += ' no message class set (but given bits would be: ';
                }

                var msgClass = o & 3;

                text += 'Class ' + msgClass + ' - ';

                if (msgClass === 0) {
                    text += 'immediate display';
                }
                else if (msgClass === 1) {
                    text += 'ME specific';
                }
                else if (msgClass === 2) {
                    text += 'SIM specific';
                }
                else if (msgClass === 3) {
                    text += 'TE specific';
                }

                text += ')';

            }

            if (codingGroup >= 0xC0 && codingGroup <= 0xE0) {
                // noinspection JSBitwiseOperatorUsage
                if (o & 8) {
                    text += 'Set Indication Active';
                }
                else {
                    text += 'Set Indication Inactive';
                }

                text += ', ';

                if (o & 4) {
                    text += '(reserved bit set, but should not!), ';
                }

                var indicationType = o & 3;

                if (indicationType === 0) {
                    text += 'Voicemail Message Waiting';
                }
                else if (indicationType === 1) {
                    text += 'Fax Message Waiting';
                }
                else if (indicationType === 2) {
                    text += 'E-Mail Message Waiting';
                }
                else if (indicationType === 3) {
                    text += 'Other Message Waiting (not yet standardized)';
                }
            }

            return {
                alphabet: alphabet,
                info: text
            };
        },

        SCTS: function( octets ) {
            var i;

            for (i = 0; i < 7; ++i) {
                octets[ i ] = reverse( octets[ i ] );
            }

            var ts = '';

            if (parseInt( octets[0], 10 ) < 70) {
                ts += '20';
            }
            else {
                ts += '19';
            }

            ts += octets[0] + '-' + octets[1] + '-' + octets[2] + ' ' + octets[3] + ':' + octets[4] + ':' + octets[5] + ' GMT ';

            var tz = parseInt( octets[6], 10 );

            if (tz & 0x80) {
                tz = tz & 0x7F;
                ts += '-';
            }
            else {
                ts += '+';
            }

            return ts + tz / 4;
        },

        UDL: function( octet, alphabet ) {
            var o = parseInt( octet, 16 );
            var length = 0;
            var chars = o;

            if (alphabet === 'default') {
                length = Math.ceil( o * 70 / 80 );
            }
            else {
                length = o;
            }

            if (alphabet === 'ucs2') {
                chars = length / 2;
            }

            return {
                septets: o,
                octets: length,
                info: chars + ' characters, ' + length + ' bytes'
            };
        },

        UDHL: function( octet, alphabet ) {
            var length = parseInt( octet, 16 );
            var padding = 0;

            if (alphabet === 'default') {
                var udhBitLength = (length + 1) * 8;
                var nextSeptetStart =  Math.ceil( udhBitLength / 7 ) * 7;

                padding = nextSeptetStart - udhBitLength;
            }

            return {
                length: length,
                padding: padding,
                info: length + ' bytes'
            };
        },

        UDH: function( octets ) {
            var i,
                IEs = [],        // all Information Elements
                IE = {},        // actual Information Element
                info = [],
                text = '',
                isWap = false,
                destPort,
                isEMS = false,
                formatting = [],
                ems = [],
                style,
                format,
                color;

            // break up Information Elements
            while (octets.length) {
                var o = parseInt( octets.shift(), 16 );

                if (IE.IEI === undefined) {
                    IE.IEI = o;        // Information Element Identifier
                }
                else if (IE.IEDL === undefined) {
                    IE.IEDL = o;    // Information Element Data Length
                }
                else {
                    if (IE.IED === undefined) {
                        IE.IED = [];
                    }
                    IE.IED.push( o );

                    if (IE.IED.length >= IE.IEDL) {
                        IEs.push( IE );
                        IE = {};
                    }
                }
            }

            // Wireless Datagram Protocol IE
            for (i = 0; i < IEs.length; ++i) {
                if (IEs[ i ].IEI === 5) {
                    destPort = IEs[ i ].IED[0] * 256 + IEs[ i ].IED[1];

                    if (destPort === 5505) {
                        destPort += ' (Ring Tone)';
                    }
                    else if (destPort === 5506) {
                        destPort += ' (Operator Logo)';
                    }
                    else if (destPort === 5507) {
                        destPort += ' (Group Graphic - CLI Logo)';
                    }
                    else if (destPort === 9200) {
                        destPort += ' (Connectionless WAP browser proxy server)';
                    }
                    else if (destPort === 9202) {
                        destPort += ' (Secure connectionless WAP browser proxy server)';
                    }
                    else if (destPort === 9203) {
                        destPort += ' (Secure WAP Browser proxy server)';
                    }
                    else if (destPort === 9204) {
                        destPort += ' (vCard)';
                    }
                    else if (destPort === 9205) {
                        destPort += ' (vCalendar)';
                    }
                    else if (destPort === 9206) {
                        destPort += ' (Secure vCard)';
                    }
                    else if (destPort === 9207) {
                        destPort += ' (Secure vCalendar)';
                    }
                    else {
                        isWap = true;
                    }

                    text = 'WDP (Wireless Datagram Protocol): Destination port is ' + destPort + ', source port is ' + (IEs[ i ].IED[2] * 256 + IEs[ i ].IED[3]);

                    if (IEs[ i ].IEDL !== 4) {
                        text += ' (VIOLATON: This Information Element should have exactly 4 bytes but says it has ' + IEs[ i ].IEDL + ' instead!)';
                    }
                    if (IEs[i].IED.length !== 4) {
                        text += ' (VIOLATION: This Information Element should have exactly 4 bytes but actually has ' + IEs[i].IED.length + ' instead!)';
                    }

                    info.push( text );
                }

                // Concatenation IE
                else if (IEs[ i ].IEI === 0) {
                    text = 'Concatenated message: reference number ' + IEs[ i ].IED[0] + ', part ' + IEs[ i ].IED[2] + ' of ' + IEs[ i ].IED[1] + ' parts';

                    if (IEs[ i ].IEDL !== 3) {
                        text += ' (VIOLATON: This Information Element should have exactly 3 bytes but says it has ' + IEs[ i ].IEDL + ' instead!)';
                    }
                    if (IEs[i].IED.length !== 3) {
                        text += ' (VIOLATION: This Information Element should have exactly 3 bytes but actually has ' + IEs[i].IED.length + ' instead!)';
                    }

                    info.push( text );
                }

                // EMS formatting IE
                else if (IEs[ i ].IEI === 10) {
                    isEMS = true;

                    style = [];
                    format = IEs[ i ].IED[2];


                    if ((format & 3) === 1) {
                        style.push( 'text-align: center' );
                    }
                    else if ((format & 3) === 2) {
                        style.push( 'text-align: right' );
                    }

                    if ((format & 0xC) === 4) {
                        style.push( 'font-size: large' );
                    }
                    else if ((format & 0xC) === 8) {
                        style.push( 'font-size: small' );
                    }

                    // noinspection JSBitwiseOperatorUsage
                    if (format & 0x20) {
                        style.push( 'font-style: italic' );
                    }

                    // noinspection JSBitwiseOperatorUsage
                    if (format & 0x10) {
                        style.push( 'font-weight: bold' );
                    }

                    // noinspection JSBitwiseOperatorUsage
                    if (format & 0x40) {
                        style.push( 'text-decoration: underline' );
                    }

                    // noinspection JSBitwiseOperatorUsage
                    if (format & 0x80) {
                        style.push( 'text-decoration: line-through' );
                    }

                    color = IEs[ i ].IED[3];

                    if (color) {
                        if ((color & 0xF) === 1) {
                            style.push( 'color: darkGray' );
                        }
                        else if ((color & 0xF) === 2) {
                            style.push( 'color: darkRed' );
                        }
                        else if ((color & 0xF) === 3) {
                            style.push( 'color: GoldenRod' );
                        }
                        else if ((color & 0xF) === 4) {
                            style.push( 'color: darkGreen' );
                        }
                        else if ((color & 0xF) === 5) {
                            style.push( 'color: darkCyan' );
                        }
                        else if ((color & 0xF) === 6) {
                            style.push( 'color: darkBlue' );
                        }
                        else if ((color & 0xF) === 7) {
                            style.push( 'color: darkMagenta' );
                        }
                        else if ((color & 0xF) === 8) {
                            style.push( 'color: gray' );
                        }
                        else if ((color & 0xF) === 9) {
                            style.push( 'color: white' );
                        }
                        else if ((color & 0xF) === 0xA) {
                            style.push( 'color: red' );
                        }
                        else if ((color & 0xF) === 0xB) {
                            style.push( 'color: yellow' );
                        }
                        else if ((color & 0xF) === 0xC) {
                            style.push( 'color: green' );
                        }
                        else if ((color & 0xF) === 0xD) {
                            style.push( 'color: cyan' );
                        }
                        else if ((color & 0xF) === 0xE) {
                            style.push( 'color: blue' );
                        }
                        else if ((color & 0xF) === 0xF) {
                            style.push( 'color: magenta' );
                        }

                        if ((color & 0xF0) === 0) {
                            style.push( 'background-color: black' );
                        }
                        else if ((color & 0xF0) === 0x10) {
                            style.push( 'background-color: darkGray' );
                        }
                        else if ((color & 0xF0) === 0x20) {
                            style.push( 'background-color: darkRed' );
                        }
                        else if ((color & 0xF0) === 0x30) {
                            style.push( 'background-color: GoldenRod' );
                        }
                        else if ((color & 0xF0) === 0x40) {
                            style.push( 'background-color: darkGreen' );
                        }
                        else if ((color & 0xF0) === 0x50) {
                            style.push( 'background-color: darkCyan' );
                        }
                        else if ((color & 0xF0) === 0x60) {
                            style.push( 'background-color: darkBlue' );
                        }
                        else if ((color & 0xF0) === 0x70) {
                            style.push( 'background-color: darkMagenta' );
                        }
                        else if ((color & 0xF0) === 0x80) {
                            style.push( 'background-color: gray' );
                        }
                        else if ((color & 0xF0) === 0x90) {
                            style.push( 'background-color: white' );
                        }
                        else if ((color & 0xF0) === 0xA0) {
                            style.push( 'background-color: red' );
                        }
                        else if ((color & 0xF0) === 0xB0) {
                            style.push( 'background-color: yellow' );
                        }
                        else if ((color & 0xF0) === 0xC0) {
                            style.push( 'background-color: green' );
                        }
                        else if ((color & 0xF0) === 0xD0) {
                            style.push( 'background-color: cyan' );
                        }
                        else if ((color & 0xF0) === 0xE0) {
                            style.push( 'background-color: blue' );
                        }
                        else if ((color & 0xF0) === 0xF0) {
                            style.push( 'background-color: magenta' );
                        }
                    }

                    if (style.length) {
                        IEs[ i ].markupOpen = '<span style="' + style.join( '; ' ) + '">';
                        IEs[ i ].markupClose = '</span>';
                    }
                    else {
                        IEs[ i ].markupOpen = '';
                        IEs[ i ].markupClose = '';
                    }

                    ems.push( IEs[ i ] );

                    formatting.push( function( text, original, i ) {
                        original = original.substr( ems[ i ].IED[0], ems[ i ].IED[1] );

                        var getPart = new RegExp( original );

                        return text.replace( getPart, ems[ i ].markupOpen + original + ems[ i ].markupClose );
                    } );

                }
            }

            if (isEMS) {
                info.push( 'has EMS formatting' );
            }

            return {wap: isWap, formatting: formatting, info: info.join( '; ' )};
        },

        UD: function( octets, alphabet, padding, formatting ) {
            var thisChar, original,
                text = '',
                i = 0;

            if (alphabet === 'default') {
                text = decode7Bit( octets, padding );
            }
            else if (alphabet === 'ucs2') {
                while (octets.length) {
                    thisChar = octets.shift() + octets.shift();
                    text += String.fromCharCode( parseInt( thisChar, 16 ) );
                }
            }
            else {
                text += '(';

                if (alphabet === '8bit') {
                    text += 'unknown binary data';
                }
                else {
                    text += 'unrecognized alphpabet';
                }

                text += ', try ASCII decoding) ';

                while (octets.length) {
                    text += String.fromCharCode( parseInt( octets.shift(), 16 ) );
                }
            }

            // Execute EMS formatting
            if (formatting && formatting.length) {
                original = text;
                for (i = 0; i < formatting.length; i++) {
                    text = formatting[ i ]( text, original, i );
                }
            }

            return text;
        },

        MR: function( octet ) {
            if (octet === '00') {
                return 'Mobile equipment sets reference number';
            }
            return '0x' + octet;
        },

        VPrelative: function( octet ) {
            var vp = parseInt( octet, 16 );
            var text = '';

            if (vp < 144) {
                text = ((vp + 1) * 5) + ' minutes';
            }
            else if (vp > 143 && vp < 168) {
                text = ((vp - 143) * 30 / 60 + 12) + ' hours';
            }
            else if (vp > 167 && vp < 197) {
                text = (vp - 166 ) + ' days';
            }
            else if (vp > 186) {
                text = (vp - 192) + ' weeks';
            }

            return text;
        }

    };


    init(); 
    function init() {
    //$( 'document' ).ready( function() {
        //var pdu = pduSend;             
        //var pdu = "0791291398422421240BD0D4F49AFA5E030000126022327491023C3FDEE8E7FBF1A8E935F5BDFEF9403399AC56AB81D27350FE5D9783EC6579DA9C1E87E9E9B71B347E93CB0A62B87CB7B2B5D1957B0E";
        //var $output = $( '#output' );
        var pdu = pduSend; 
        if (!pdu) {
            //$output.empty();
            return false;
        }

        var prefix = '00';
        var alphabet = undefined;
        var len;
        //console.log(pdu); 
        //$output.html( constructOutput( pdu ) );
        var outputting = constructOutput(pdu); 
        //console.log(pdu); 

        // $output.find( 'td:last:contains(&lt;)' ).each( function() {
        //     var $this = $( this );

        //     $this.text( $this.text().replace( /&lt;/g, '<' ).replace( /&gt;/g, '>' ).replace( /&amp;/g, '&' ) );
        // });
        var obj = JSON.stringify(outputting);
        console.log(obj); 
        //return obj;
    //} );
}

    function constructOutput( pdu ) {
        var i,
            info = '';

        var data = pduDecoder( pdu );

        var datastr = '';

        if (typeof data === 'object') {
            for (i = 0; i < data.length; ++i) {
                datastr += data[ i ];
            }
        }
        else {
            datastr = data;
        }
        return data;
        // return '<p>' + info.replace( /\n/g, '<br />' ) + '</p><table class="data"><tbody>' + datastr + '</tbody></table>';
    }

    function pduDecoder( pdu ) {
        var i,
            //result = [];
            result;

        var octets = splitter( pdu );

        if (!octets) {
            return "Invalid PDU String!";
        }

        var tokens = tokenizer( octets );

        // for (i = 0; i < tokens.length; ++i) {
        //     result.push( tokens[ i ]() );
        // }

        return tokens;
    }

    function splitter( pdu ) {
        var i,
            octets = [];

        for (i = 0; i < pdu.length; i += 2) {
            var octet = pdu.substr( i, 2 );

            if (!octet.match( /^[0-9A-F]{2}$/i )) {
                return null;
            }

            octets.push( octet );
        }

        return octets;
    }

    function tokenizer( octets ) {
        var tokenList = [];
        var pos;
        var numberLength;
        var sliceNumber;
        var sliceNumberToA;
        var TP_PID;
        var TP_DCS;
        var dataList = {}; 
        dataList.test = "al";

        // smsc part
        var smscLength = parseInt( octets[0], 16 );

        if (smscLength) {
            var sliceSmsc = octets.slice( 2, smscLength + 1 );
            var sliceSmscToA = octets[1];
            // tokenList.push( function(){ return '(hideable)SMSC number\t' + tokens.Number( sliceSmsc, undefined, tokens.ToA( sliceSmscToA ) ); } );
            // tokenList.push( function(){ return '(hideable)SMSC number info\t' + tokens.ToA( sliceSmscToA ).info; } );
            var smscNumber = tokens.Number(sliceSmsc, undefined, tokens.ToA( sliceSmscToA ));
            var smscInfo = tokens.ToA( sliceSmscToA ).info;
            dataList.smsc_number = smscNumber; 
            dataList.smsc_info = smscInfo; 
            //console.log(dataList); 
        }

        // Sender/Receiver part
        pos = smscLength + 1;
        var pduType = tokens.ToM( octets[ pos ] );
        // tokenList.push( function(){ return '(hideable)PDU Type\t' + pduType.info; } );
        dataList.pdu_type = pduType.info; 

        if (pduType.type === 'deliver') {
            pos++;
            numberLength = parseInt( octets[ pos ], 16 );

            pos++;
            if(numberLength) {
                sliceNumber = octets.slice( pos + 1, pos + 1 + Math.ceil( numberLength / 2 ) );
                sliceNumberToA = octets[ pos ];
                // tokenList.push( function(){ return '(hideable)Number\t' + tokens.Number( sliceNumber, numberLength, tokens.ToA( sliceNumberToA ) ); } );
                // tokenList.push( function(){ return '(hideable)Number info\t' + tokens.ToA( sliceNumberToA ).info; } );

                var sid_number = tokens.Number(sliceNumber, numberLength, tokens.ToA(sliceNumberToA));
                var sid_info = tokens.ToA(sliceNumberToA).info;
	            dataList.sid_number = sid_number; 
	            dataList.sid_info = sid_info; 
                pos += 1 + Math.ceil( numberLength / 2 );
            }

            TP_PID = octets[ pos ];
            // tokenList.push( function(){ return '(hideable)Protocol Identifier\t' + tokens.PID( TP_PID ); } );
            dataList.protocol_identifier = tokens.PID(TP_PID); 

            pos++;
            TP_DCS = tokens.DCS( octets[ pos ] );
            //tokenList.push( function(){ return '(hideable)Data Coding Scheme\t' + TP_DCS.info; } );
            //dataList.push({"dcs" : TP_DCS.info}); 

            pos++;
            var sliceTimeStamp = octets.slice( pos, pos + 7 );
            //tokenList.push( function(){ return '(hideable)Service Centre Time Stamp\t' + tokens.SCTS( sliceTimeStamp ); } );
            //dataList.push({"smsc_time" : tokens.SCTS(sliceTimeStamp)}); 
            pos += 6;
        }
        else if (pduType.type === 'submit') {
            pos++;
            var MR = octets[ pos ];
            //tokenList.push( function() { return '(hideable)TP Message Reference\t' + tokens.MR( MR ); } );
            //dataList.push({"messref" : tokens.MR(MR)}); 
            pos++;
            numberLength = parseInt(octets[pos], 16 );
            pos++;
            if (numberLength) {
                sliceNumber = octets.slice( pos + 1, pos + 1 + Math.ceil( numberLength / 2 ) );
                sliceNumberToA = octets[ pos ];
                // tokenList.push( function(){ return '(hideable)Number\t' + tokens.Number( sliceNumber, numberLength, tokens.ToA( sliceNumberToA ) ); } );
                // tokenList.push( function(){ return '(hideable)Number info\t' + tokens.ToA( sliceNumberToA ).info; } );
	            var smscNumber = tokens.Number(sliceNumber, numberLength, tokens.ToA(sliceNumberToA));
	            var smscInfo = tokens.ToA(sliceNumberToA).info;
	            //dataList.push({"smsc_number" : smscNumber}); 
	            //dataList.push({"smsc_info" : smscInfo}); 
                pos += 1 + Math.ceil( numberLength / 2 );
            }

            TP_PID = octets[ pos ];
            //tokenList.push( function(){ return '(hideable)Protocol Identifier\t' + tokens.PID( TP_PID ); } );
            //dataList.push({"protocol_identifier" : tokens.PID(TP_PID)}); 

            pos++;
            TP_DCS = tokens.DCS( octets[ pos ] );
            tokenList.push( function(){ return '(hideable)Data Coding Scheme\t' + TP_DCS.info; } );
            //dataList.push({"dcs" : TP_DCS.info}); 

            if (pduType.TP_VPF) {
                pos++;
                var sliceVP;
                if (pduType.TP_VPF === 'relative') {
                    sliceVP = octets[ pos ];
                    // tokenList.push( function(){ return '(hideable)Validity Period\t' + tokens.VPrelative( sliceVP ); } );
		            //dataList.push({"valpri" : tokens.VPrelative(sliceVP)}); 
                }
                else if (pduType.TP_VPF.match( /^(absolute|relative)$/ )) {
                    sliceVP = octets.slice( pos, pos + 7 );
                    // tokenList.push( function(){ return '(hideable)Validity Period\tuntil ' + tokens.SCTS( sliceVP ); } );
		            //dataList.push({"valpriuntil" : tokens.SCTS(sliceVP)}); 
                    pos += 6;
                }
            }
        }

        pos ++;
        var TP_UDL = tokens.UDL( octets[ pos ], TP_DCS.alphabet );
        // tokenList.push( function(){ return 'User Data Length\t' + TP_UDL.info; } );
        //dataList.push({"sms_length" : TP_UDL.info}); 

        var TP_UDHL = {};
        var TP_UDH = {};
        if (pduType.TP_UDHI) {
            pos++;
            TP_UDHL = tokens.UDHL( octets[ pos ], TP_DCS.alphabet );
            // tokenList.push( function() { return 'User Data Header Length\t' + TP_UDHL.info; } );
            //dataList.push({"userDataHeaderLength" : TP_UDHL.info}); 

            pos++;
            TP_UDH = tokens.UDH( octets.slice( pos, pos + TP_UDHL.length ) );
            // tokenList.push( function() { return 'User Data Header\t' + TP_UDH.info; } );
            //dataList.push({"userDataHeader" : TP_UDH.info}); 
            pos += TP_UDHL.length - 1;
        }

        pos++;
        var expectedMsgEnd = pos + TP_UDL.octets - (TP_UDHL.length ? TP_UDHL.length + 1 : 0);
        var sliceMessage = octets.slice( pos, expectedMsgEnd );

        if (TP_UDH.wap) {
            var wapMessage = wapDecoder( sliceMessage );
            // tokenList.push( function(){ return 'User Data\tWireless Session Protocol (WSP) / WBXML ' + wapMessage; } );
            //dataList.push({"wsp" : wapMessage}); 
        }
        else {
            // tokenList.push( function(){ return 'User Data\t' + tokens.UD( sliceMessage, TP_DCS.alphabet, TP_UDHL.padding, TP_UDH.formatting ); } );
			var user_data = tokens.UD(sliceMessage, TP_DCS.alphabet, TP_UDHL.padding, TP_UDH.formatting);
            //dataList.push({"user_data" : user_data}); 
        }
        //console.log(dataList); 
        //return tokenList;
        return dataList;
    }


    function decode7Bit( octets, padding ) {
        var thisAndNext, thisChar, character,
            nextChar = '',
            text = '';

        if (padding && octets.length) {
            nextChar = padwZeros( parseInt( octets.shift(), 16 ).toString( 2 ) );
            nextChar = nextChar.substring( 0, nextChar.length - padding );
        }

        while (octets.length || parseInt( nextChar, 2 )) {
            thisAndNext = getChar( octets, nextChar );
            thisChar = thisAndNext[0];
            nextChar = thisAndNext[1];
            character = gsm7bit[ parseInt( thisChar, 2 ) ];

            // Extension table on 0x1B
            if (typeof character === 'object') {
                thisAndNext = getChar( octets, nextChar );
                thisChar = thisAndNext[0];
                nextChar = thisAndNext[1];
                character = character[ parseInt( thisChar, 2 ) ];
            }

            text += character ? character : '';
        }

        return text;
    }

    function getChar( octets, nextChar ) {
        if (nextChar.length === 7) {
            return [nextChar, ''];
        }

        var octet = padwZeros( parseInt( octets.shift(), 16 ).toString( 2 ) );
        var bitsFromNextChar = nextChar.length + 1;
        var thisChar = octet.substr( bitsFromNextChar ) + nextChar;
        nextChar = octet.substr( 0, bitsFromNextChar );

        return [thisChar, nextChar];
    }

    function reverse( octet ) {
        if (typeof octet === 'string') {
            return octet.substr( 1, 1 ) + octet.substr( 0, 1 );
        }
        else {
            return '00';
        }
    }

    function padwZeros( bitstream ) {
        while (bitstream.length < 8) {
            bitstream = '0' + bitstream;
        }
        return bitstream;
    }


    function wapDecoder( octets ) {
        var i,
            pos = 0,
            data = [],
            dataStr = '';

        data.push( 'WSP Transaction ID\t0x' + octets[ pos ] );

        pos++;
        data.push( 'Type\t' + wapTokens.type( octets[ pos ] ) );

        pos++;
        var headerLength = parseInt( octets[ pos ], 16 );
        pos++;
        data.push( 'Wireless Session Protocol\t' + wapTokens.WSP( octets.slice( pos, pos + headerLength ) ) );

        pos += headerLength;

        data.push( 'WAP Binary XML\t' + wapTokens.WBXML( octets.slice( pos ) ) );


        for (i = 0; i < data.length; ++i) {
            dataStr += '<tr><td>' + data[ i ].replace( /\t/, '</td><td>' ) + '</td></tr>';
        }


        return '<table><tbody>' + dataStr + '</tbody></table>';
    }


    function setForm() {
        var query = document.location.search.substr( 1 ).split( '&' );
        var params = {};
        var i;
        var p;
        var $fields;
        var re = {
            textarea: /^TEXTAREA$/i,
            input: /^INPUT$/i,
            text: /^text$/i,
            checkbox_radio: /^(checkbox|radio)$/i
        };
        var changed = false;

        for (i = 0; i < query.length; ++i) {
            p = query[ i ].split( '=' );

            if (!params[ p[0] ]) {
                params[ p[0] ] = p[1];
            }
            else {
                params[ p[0] ] = [params[ p[0] ], p[1]];
            }
        }

        for (i in params) {
            if (params.hasOwnProperty( i )) {
                $fields = $( '[name="' + i + '"]' );

                $fields.each( function() {
                    if (this.tagName.match( re.textarea ) || (this.tagName.match( re.input ) && this.type.match( re.text ))) {
                        this.value = params[ i ];
                        changed = true;
                    }

                    else if (this.tagName.match( re.input ) && this.type.match( re.checkbox_radio ) && this.value === params[ i ]) {
                        this.checked = true;
                        $( this ).change();
                        changed = true;
                    }
                } );
            }
        }

        return changed;
    }

    function cleanInput( field ) {
        var $field = $( field );

        $field.val( $field.val().replace( /\s/g, '' ) );
    }

//}());


